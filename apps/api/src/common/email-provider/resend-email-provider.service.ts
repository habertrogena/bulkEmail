import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import type { WebhookEventPayload } from 'resend';
import { isRetryableResendError } from './resend-error';
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
export class ResendEmailProviderService implements EmailProviderService {
  private clientInstance: Resend | undefined;

  /**
   * Lazy: the Resend SDK's constructor throws immediately if no API key is
   * set, so this must not run at app startup (and it won't — Nest only
   * instantiates this class, it never calls this getter until a company
   * whose emailProvider is "resend" actually needs it).
   */
  private get client(): Resend {
    if (!this.clientInstance) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error(
          'RESEND_API_KEY is not set, but a company is configured to send via Resend',
        );
      }
      this.clientInstance = new Resend(apiKey);
    }
    return this.clientInstance;
  }

  async createDomainIdentity(
    domain: string,
  ): Promise<CreateDomainIdentityResult> {
    const { data, error } = await this.client.domains.create({ name: domain });
    if (error || !data) {
      throw new Error(
        `Resend domain creation failed: ${error?.message ?? 'unknown error'}`,
      );
    }

    const dnsRecords: DnsRecord[] = data.records.map((record) => ({
      label: record.record,
      type: record.type,
      name: record.name,
      value: record.value,
      priority: 'priority' in record ? record.priority : undefined,
    }));

    return { dnsRecords, providerDomainId: data.id };
  }

  async getDomainVerificationStatus(
    domain: string,
    providerDomainId?: string | null,
  ): Promise<DomainVerificationStatus> {
    const domainId = providerDomainId ?? (await this.findDomainId(domain));
    if (!domainId) return 'pending';

    const { data, error } = await this.client.domains.get(domainId);
    if (error || !data) return 'pending';

    if (data.status === 'verified') return 'verified';
    if (data.status === 'failed' || data.status === 'partially_failed') {
      return 'failed';
    }
    return 'pending';
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { data, error } = await this.client.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      headers: {
        'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (error || !data) {
      throw new ProviderSendError(
        error?.message ?? 'Unknown Resend error',
        isRetryableResendError(error?.name),
      );
    }

    return { providerMessageId: data.id };
  }

  /**
   * Verifies a Resend webhook request using the Standard Webhooks scheme
   * Resend signs with (webhook-id / webhook-timestamp / webhook-signature
   * headers, HMAC over the exact raw body) — kept here, not in the webhooks
   * module, so no other module needs to know Resend uses Svix under the hood.
   * Throws if the signature is invalid.
   */
  verifyWebhookEvent(
    rawBody: string,
    headers: { id: string; timestamp: string; signature: string },
    webhookSecret: string,
  ): WebhookEventPayload {
    return this.client.webhooks.verify({
      payload: rawBody,
      headers,
      webhookSecret,
    });
  }

  /** Fallback for a company whose providerDomainId wasn't persisted for some reason — Resend has no "get by name" endpoint. */
  private async findDomainId(domain: string): Promise<string | null> {
    const { data } = await this.client.domains.list();
    return data?.data.find((d) => d.name === domain)?.id ?? null;
  }
}
