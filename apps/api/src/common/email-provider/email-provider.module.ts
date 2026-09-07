import { Module } from '@nestjs/common';
import { SesModule } from '../ses/ses.module';
import { SesEmailProviderService } from './ses-email-provider.service';
import { ResendEmailProviderService } from './resend-email-provider.service';
import { EmailProviderFactory } from './email-provider.factory';

@Module({
  imports: [SesModule],
  providers: [
    SesEmailProviderService,
    ResendEmailProviderService,
    EmailProviderFactory,
  ],
  exports: [EmailProviderFactory, ResendEmailProviderService],
})
export class EmailProviderModule {}
