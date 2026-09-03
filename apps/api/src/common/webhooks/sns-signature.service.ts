import { Injectable, Logger } from '@nestjs/common';
import { createVerify } from 'node:crypto';
import type { SnsEnvelope } from './sns-message.types';

const CERT_URL_PATTERN = /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\/.+\.pem$/;

const NOTIFICATION_FIELDS = [
  'Message',
  'MessageId',
  'Subject',
  'SubscribeURL',
  'Timestamp',
  'Token',
  'TopicArn',
  'Type',
] as const;

@Injectable()
export class SnsSignatureService {
  private readonly logger = new Logger(SnsSignatureService.name);
  private readonly certCache = new Map<string, string>();

  async verify(envelope: SnsEnvelope): Promise<boolean> {
    try {
      if (!CERT_URL_PATTERN.test(envelope.SigningCertURL)) {
        this.logger.warn(
          `Rejected SNS message: untrusted SigningCertURL host: ${envelope.SigningCertURL}`,
        );
        return false;
      }

      const cert = await this.getCertificate(envelope.SigningCertURL);
      const canonicalString = this.buildCanonicalString(envelope);
      const algorithm =
        envelope.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';

      const verifier = createVerify(algorithm);
      verifier.update(canonicalString, 'utf8');
      return verifier.verify(cert, envelope.Signature, 'base64');
    } catch (error) {
      this.logger.warn(`SNS signature verification failed: ${String(error)}`);
      return false;
    }
  }

  private async getCertificate(url: string): Promise<string> {
    const cached = this.certCache.get(url);
    if (cached) return cached;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch SNS signing cert: ${response.status}`);
    }
    const cert = await response.text();
    this.certCache.set(url, cert);
    return cert;
  }

  private buildCanonicalString(envelope: SnsEnvelope): string {
    let result = '';
    for (const field of NOTIFICATION_FIELDS) {
      const value = envelope[field];
      if (value === undefined || value === null) continue;
      result += `${field}\n${value}\n`;
    }
    return result;
  }
}
