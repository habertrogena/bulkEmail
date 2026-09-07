import { Injectable } from '@nestjs/common';
import { SesService } from '../ses/ses.service';
import { isRetryableSesError, sesErrorMessage } from './ses-error';
import {
  CreateDomainIdentityResult,
  DnsRecord,
  DomainVerificationStatus,
  EmailProviderService,
  ProviderSendError,
  SendEmailParams,
  SendEmailResult,
} from './email-provider.interface';

@Injectable()
export class SesEmailProviderService implements EmailProviderService {
  constructor(private readonly ses: SesService) {}

  async createDomainIdentity(
    domain: string,
  ): Promise<CreateDomainIdentityResult> {
    const result = await this.ses.createEmailIdentity(domain);
    const dkimTokens = result.DkimAttributes?.Tokens ?? [];

    const dnsRecords: DnsRecord[] = dkimTokens.map((token) => ({
      label: 'DKIM',
      type: 'CNAME',
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
    }));

    return { dnsRecords };
  }

  async getDomainVerificationStatus(
    domain: string,
  ): Promise<DomainVerificationStatus> {
    const result = await this.ses.getEmailIdentity(domain);

    if (
      result.VerifiedForSendingStatus === true ||
      result.DkimAttributes?.Status === 'SUCCESS'
    ) {
      return 'verified';
    }
    if (
      result.DkimAttributes?.Status === 'FAILED' ||
      result.DkimAttributes?.Status === 'TEMPORARY_FAILURE'
    ) {
      return 'failed';
    }
    return 'pending';
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const result = await this.ses.sendEmail({
        fromAddress: params.from,
        toAddress: params.to,
        replyTo: params.replyTo,
        configurationSetName: params.configurationOrTagId,
        subject: params.subject,
        htmlBody: params.html,
        unsubscribeUrl: params.unsubscribeUrl,
      });
      return { providerMessageId: result.MessageId ?? '' };
    } catch (error) {
      throw new ProviderSendError(
        sesErrorMessage(error),
        isRetryableSesError(error),
      );
    }
  }
}
