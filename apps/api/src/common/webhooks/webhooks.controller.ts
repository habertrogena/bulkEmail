import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
} from '@nestjs/common';
import { SnsSignatureService } from './sns-signature.service';
import { WebhooksService } from './webhooks.service';
import type { SesNotification, SnsEnvelope } from './sns-message.types';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly snsSignature: SnsSignatureService,
    private readonly webhooksService: WebhooksService,
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
}
