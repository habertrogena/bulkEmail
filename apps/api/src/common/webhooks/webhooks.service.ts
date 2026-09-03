import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  SesBounceNotification,
  SesComplaintNotification,
  SesDeliveryNotification,
  SesNotification,
} from './sns-message.types';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleSesNotification(notification: SesNotification): Promise<void> {
    const configurationSetName =
      notification.mail.tags?.['ses:configuration-set']?.[0];
    if (!configurationSetName) {
      this.logger.warn(
        `SES notification missing configuration-set tag, messageId=${notification.mail.messageId}`,
      );
      return;
    }

    const company = await this.prisma.company.findFirst({
      where: { configurationSetName },
    });
    if (!company) {
      this.logger.warn(
        `No company found for configuration set ${configurationSetName}`,
      );
      return;
    }

    switch (notification.eventType) {
      case 'Delivery':
        await this.handleDelivery(notification as SesDeliveryNotification);
        break;
      case 'Bounce':
        await this.handleBounce(
          company.id,
          notification as SesBounceNotification,
        );
        break;
      case 'Complaint':
        await this.handleComplaint(
          company.id,
          notification as SesComplaintNotification,
        );
        break;
      default:
        this.logger.debug(`Ignoring SES event type ${notification.eventType}`);
    }
  }

  private async handleDelivery(
    notification: SesDeliveryNotification,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findFirst({
        where: { sesMessageId: notification.mail.messageId },
      });
      // Idempotent: only progress recipients that haven't already reached a
      // terminal or later state — a duplicate SNS delivery must not double-count.
      if (!recipient || recipient.status !== 'sent') return;

      await tx.recipient.update({
        where: { id: recipient.id },
        data: { status: 'delivered', deliveredAt: new Date() },
      });
      await tx.campaign.update({
        where: { id: recipient.campaignId },
        data: { deliveredCount: { increment: 1 } },
      });
    });
  }

  private async handleBounce(
    companyId: string,
    notification: SesBounceNotification,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findFirst({
        where: { sesMessageId: notification.mail.messageId },
      });
      if (!recipient || recipient.status === 'bounced') return;

      await tx.recipient.update({
        where: { id: recipient.id },
        data: { status: 'bounced' },
      });
      await tx.campaign.update({
        where: { id: recipient.campaignId },
        data: { bouncedCount: { increment: 1 } },
      });

      if (notification.bounce.bounceType === 'Permanent') {
        await tx.suppressionEntry.upsert({
          where: {
            companyId_email: { companyId, email: recipient.email },
          },
          update: {},
          create: { companyId, email: recipient.email, reason: 'bounce' },
        });
      }
    });
  }

  private async handleComplaint(
    companyId: string,
    notification: SesComplaintNotification,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findFirst({
        where: { sesMessageId: notification.mail.messageId },
      });
      if (!recipient || recipient.status === 'complained') return;

      await tx.recipient.update({
        where: { id: recipient.id },
        data: { status: 'complained' },
      });
      await tx.campaign.update({
        where: { id: recipient.campaignId },
        data: { complainedCount: { increment: 1 } },
      });
      await tx.suppressionEntry.upsert({
        where: { companyId_email: { companyId, email: recipient.email } },
        update: {},
        create: { companyId, email: recipient.email, reason: 'complaint' },
      });
    });
  }
}
