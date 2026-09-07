import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { SesEmailProviderService } from './ses-email-provider.service';
import { ResendEmailProviderService } from './resend-email-provider.service';
import { EmailProviderService } from './email-provider.interface';

@Injectable()
export class EmailProviderFactory {
  constructor(
    private readonly ses: SesEmailProviderService,
    private readonly resend: ResendEmailProviderService,
  ) {}

  forCompany(company: Pick<Company, 'emailProvider'>): EmailProviderService {
    switch (company.emailProvider) {
      case 'resend':
        return this.resend;
      case 'ses':
      default:
        return this.ses;
    }
  }
}
