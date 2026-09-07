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
    switch (notification.eventType) {
      case 'Delivery':
        await this.recordDelivered(
          (notification as SesDeliveryNotification).mail.messageId,
        );
        break;
      case 'Bounce': {
        const bounce = notification as SesBounceNotification;
        await this.recordBounced(
          bounce.mail.messageId,
          bounce.bounce.bounceType === 'Permanent',
        );
        break;
      }
      case 'Complaint':
        await this.recordComplained(
          (notification as SesComplaintNotification).mail.messageId,
        );
        break;
      default:
        this.logger.debug(`Ignoring SES event type ${notification.eventType}`);
    }
  }

  /**
   * Shared by every provider's webhook handler: find the recipient this
   * provider-issued message id belongs to and progress its status. Keeping
   * this here (rather than inline per-provider) is what lets the SES and
   * Resend webhook handlers apply identical suppression/status-update rules
   * without duplicating them.
   */
  async recordDelivered(providerMessageId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findFirst({
        where: { providerMessageId },
      });
      // Idempotent: only progress recipients that haven't already reached a
      // terminal or later state — a duplicate delivery event must not double-count.
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

  async recordBounced(
    providerMessageId: string,
    permanent: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findFirst({
        where: { providerMessageId },
        include: { campaign: true },
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

      if (permanent) {
        await tx.suppressionEntry.upsert({
          where: {
            companyId_email: {
              companyId: recipient.campaign.companyId,
              email: recipient.email,
            },
          },
          update: {},
          create: {
            companyId: recipient.campaign.companyId,
            email: recipient.email,
            reason: 'bounce',
          },
        });
      }
    });
  }

  async recordComplained(providerMessageId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findFirst({
        where: { providerMessageId },
        include: { campaign: true },
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
        where: {
          companyId_email: {
            companyId: recipient.campaign.companyId,
            email: recipient.email,
          },
        },
        update: {},
        create: {
          companyId: recipient.campaign.companyId,
          email: recipient.email,
          reason: 'complaint',
        },
      });
    });
  }
}
