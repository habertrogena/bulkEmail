import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SnsSignatureService } from './sns-signature.service';
import { EmailProviderModule } from '../email-provider/email-provider.module';

@Module({
  imports: [EmailProviderModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, SnsSignatureService],
})
export class WebhooksModule {}
