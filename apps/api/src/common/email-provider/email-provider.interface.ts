/**
 * DNS record a customer needs to add at their registrar to verify a sending
 * domain. Providers return a heterogeneous set of these (SES: three DKIM
 * CNAMEs; Resend: SPF/DKIM/MX records mixed) — `label` distinguishes what
 * each record is for in the UI, `priority` is only meaningful for MX.
 */
export interface DnsRecord {
  label: string; // e.g. "DKIM", "SPF", "Receiving"
  type: 'CNAME' | 'TXT' | 'MX' | 'CAA';
  name: string;
  value: string;
  priority?: number;
}

export type DomainVerificationStatus = 'pending' | 'verified' | 'failed';

export interface CreateDomainIdentityResult {
  dnsRecords: DnsRecord[];
  /**
   * Opaque id the provider needs to re-check verification status later.
   * SES doesn't use one (the domain name itself is the identity); Resend
   * requires the domain id it handed back at creation time.
   */
  providerDomainId?: string;
}

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  /** SES: configuration set name to route delivery events. Resend ignores this — event routing there is by email id, not a per-company set. */
  configurationOrTagId?: string;
}

export interface SendEmailResult {
  providerMessageId: string;
}

/**
 * Thrown by sendEmail on failure, classified the same way regardless of
 * provider so the queue processor's retry logic never needs to know which
 * provider is in use.
 */
export class ProviderSendError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderSendError';
  }
}

export interface EmailProviderService {
  createDomainIdentity(domain: string): Promise<CreateDomainIdentityResult>;
  /** `providerDomainId` is required by providers that can't look up status by domain name alone (see CreateDomainIdentityResult). */
  getDomainVerificationStatus(
    domain: string,
    providerDomainId?: string | null,
  ): Promise<DomainVerificationStatus>;
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
}
