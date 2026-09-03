import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SesService } from '../ses/ses.service';
import { EMAIL_SENDING_QUEUE } from './queue.constants';
import { injectUnsubscribeLink, renderTemplate } from './render-template';
import { createUnsubscribeToken } from '../suppression/unsubscribe-token';
import { isRetryableSesError, sesErrorMessage } from './ses-error';

interface EmailSendingJobData {
  recipientId: string;
}

@Processor(EMAIL_SENDING_QUEUE)
export class EmailSendingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSendingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ses: SesService,
  ) {
    super();
  }

  async process(job: Job<EmailSendingJobData>): Promise<void> {
    const recipient = await this.prisma.recipient.findUnique({
      where: { id: job.data.recipientId },
      include: { campaign: { include: { company: true } } },
    });
    if (!recipient || recipient.status !== 'pending') return;

    const { campaign } = recipient;
    const { company } = campaign;

    const suppressed = await this.prisma.suppressionEntry.findUnique({
      where: {
        companyId_email: { companyId: company.id, email: recipient.email },
      },
    });
    if (suppressed) {
      await this.markFailed(recipient.id, 'Recipient is suppressed');
      return;
    }

    const unsubscribeUrl = `${process.env.API_URL ?? 'http://localhost:4500'}/unsubscribe/${createUnsubscribeToken(company.id, recipient.email)}`;

    const rendered = injectUnsubscribeLink(
      renderTemplate(
        campaign.bodyHtml,
        recipient.mergeData as Record<string, unknown> | null,
      ),
      unsubscribeUrl,
    );

    try {
      const result = await this.ses.sendEmail({
        fromAddress: campaign.fromAddress,
        toAddress: recipient.email,
        replyTo: campaign.replyTo ?? undefined,
        configurationSetName: company.configurationSetName ?? undefined,
        subject: campaign.subject,
        htmlBody: rendered,
      });

      await this.prisma.$transaction([
        this.prisma.recipient.update({
          where: { id: recipient.id },
          data: {
            status: 'sent',
            sesMessageId: result.MessageId,
            sentAt: new Date(),
          },
        }),
        this.prisma.campaign.update({
          where: { id: campaign.id },
          data: { sentCount: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      if (isRetryableSesError(error)) {
        this.logger.warn(
          `Retryable SES error for recipient ${recipient.id}: ${sesErrorMessage(error)}`,
        );
        throw error;
      }
      await this.markFailed(recipient.id, sesErrorMessage(error));
    }

    await this.completeCampaignIfDone(campaign.id);
  }

  private markFailed(recipientId: string, errorMessage: string) {
    return this.prisma.recipient.update({
      where: { id: recipientId },
      data: { status: 'failed', errorMessage },
    });
  }

  private async completeCampaignIfDone(campaignId: string): Promise<void> {
    const stillPending = await this.prisma.recipient.count({
      where: { campaignId, status: 'pending' },
    });
    if (stillPending === 0) {
      await this.prisma.campaign.updateMany({
        where: { id: campaignId, status: 'sending' },
        data: { status: 'completed' },
      });
    }
  }
}
