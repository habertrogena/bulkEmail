import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
} from '@nestjs/common';
import { SnsSignatureService } from './sns-signature.service';
import { WebhooksService } from './webhooks.service';
import { ResendEmailProviderService } from '../email-provider/resend-email-provider.service';
import type { SesNotification, SnsEnvelope } from './sns-message.types';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly snsSignature: SnsSignatureService,
    private readonly webhooksService: WebhooksService,
    private readonly resendProvider: ResendEmailProviderService,
  ) {}

  @Post('ses')
  async handleSes(@Body() rawBody: string): Promise<{ ok: boolean }> {
    let envelope: SnsEnvelope;
    try {
      envelope = JSON.parse(rawBody) as SnsEnvelope;
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    const verified = await this.snsSignature.verify(envelope);
    if (!verified) {
      throw new BadRequestException('Invalid SNS message signature');
    }

    if (envelope.Type === 'SubscriptionConfirmation') {
      if (envelope.SubscribeURL) {
        const response = await fetch(envelope.SubscribeURL);
        this.logger.log(
          `SNS subscription confirmation GET ${response.ok ? 'succeeded' : 'failed'} (${response.status})`,
        );
      }
      return { ok: true };
    }

    if (envelope.Type === 'Notification') {
      let notification: SesNotification;
      try {
        notification = JSON.parse(envelope.Message) as SesNotification;
      } catch {
        throw new BadRequestException('Invalid notification payload');
      }
      await this.webhooksService.handleSesNotification(notification);
    }

    return { ok: true };
  }

  @Post('resend')
  async handleResend(
    @Body() rawBody: string,
    // Resend delivers webhooks via Svix, so the real wire headers are
    // svix-id/svix-timestamp/svix-signature — "webhook-*" is only the
    // resend SDK's internal parameter naming for verifyWebhookEvent below,
    // not an actual HTTP header Resend sends.
    @Headers('svix-id') webhookId: string,
    @Headers('svix-timestamp') webhookTimestamp: string,
    @Headers('svix-signature') webhookSignature: string,
  ): Promise<{ ok: boolean }> {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error(
        'Received a Resend webhook but RESEND_WEBHOOK_SECRET is not set',
      );
      throw new BadRequestException('Resend webhooks are not configured');
    }
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      throw new BadRequestException('Missing webhook signature headers');
    }

    let event;
    try {
      event = this.resendProvider.verifyWebhookEvent(
        rawBody,
        { id: webhookId, timestamp: webhookTimestamp, signature: webhookSignature },
        secret,
      );
    } catch {
      throw new BadRequestException('Invalid Resend webhook signature');
    }

    switch (event.type) {
      case 'email.delivered':
        await this.webhooksService.recordDelivered(event.data.email_id);
        break;
      case 'email.bounced':
        // Resend's bounce.type isn't a strictly-typed union in its SDK
        // (unlike SES's Permanent/Transient) — treat anything explicitly
        // reported as a hard/permanent bounce as suppression-worthy, and
        // everything else as transient (do not suppress).
        await this.webhooksService.recordBounced(
          event.data.email_id,
          event.data.bounce.type?.toLowerCase() === 'permanent' ||
            event.data.bounce.subType?.toLowerCase().includes('hard'),
        );
        break;
      case 'email.complained':
        await this.webhooksService.recordComplained(event.data.email_id);
        break;
      default:
        this.logger.debug(`Ignoring Resend event type ${event.type}`);
    }

    return { ok: true };
  }
}
