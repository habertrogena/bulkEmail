import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SesService } from '../ses/ses.service';
import { EmailProviderFactory } from '../email-provider/email-provider.factory';
import type { DnsRecord } from '../email-provider/email-provider.interface';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ses: SesService,
    private readonly providerFactory: EmailProviderFactory,
  ) {}

  /** Called once right after a Company is created. */
  async provisionConfigurationSet(companyId: string): Promise<void> {
    const configurationSetName = `company-${companyId}`;
    await this.ses.createConfigurationSet(configurationSetName);
    await this.prisma.company.update({
      where: { id: companyId },
      data: { configurationSetName },
    });
  }

  async addDomain(companyId: string, domain: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });
    const provider = this.providerFactory.forCompany(company);
    const { dnsRecords, providerDomainId } =
      await provider.createDomainIdentity(domain);

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        sendingDomain: domain,
        domainVerified: false,
        dnsRecords: dnsRecords as unknown as object,
        providerDomainId: providerDomainId ?? null,
      },
    });

    return { domain, instructions: dnsRecords };
  }

  async getProfile(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const dnsRecords = (company.dnsRecords as DnsRecord[] | null) ?? [];

    return {
      sendingDomain: company.sendingDomain,
      domainVerified: company.domainVerified,
      approvedSenders: company.approvedSenders,
      planTier: company.planTier,
      monthlyEmailLimit: company.monthlyEmailLimit,
      instructions: dnsRecords,
    };
  }

  async getDomainStatus(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    if (!company.sendingDomain) {
      return { sendingDomain: null, domainVerified: false };
    }

    const provider = this.providerFactory.forCompany(company);
    const status = await provider.getDomainVerificationStatus(
      company.sendingDomain,
      company.providerDomainId,
    );
    const verified = status === 'verified';

    if (verified !== company.domainVerified) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: { domainVerified: verified },
      });
    }

    return { sendingDomain: company.sendingDomain, domainVerified: verified };
  }

  async addSender(companyId: string, address: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const platformDomain = process.env.PLATFORM_SENDING_DOMAIN;
    const addressDomain = address.split('@')[1]?.toLowerCase();

    const onVerifiedCompanyDomain =
      company.domainVerified &&
      company.sendingDomain &&
      addressDomain === company.sendingDomain.toLowerCase();
    const onPlatformDomain =
      !!platformDomain && addressDomain === platformDomain.toLowerCase();
    // Resend companies verify their sending domain directly in Resend's own
    // dashboard, not through our /companies/domain flow — Resend's send API
    // is the real enforcement (it rejects sends from a domain it hasn't
    // verified), so we don't duplicate that gate here for them.
    const providerHandlesVerification = company.emailProvider === 'resend';

    if (!onVerifiedCompanyDomain && !onPlatformDomain && !providerHandlesVerification) {
      throw new BadRequestException(
        'Sender address must be on your verified sending domain, or the shared platform domain until your domain is verified.',
      );
    }

    if (company.approvedSenders.includes(address)) {
      return { approvedSenders: company.approvedSenders };
    }

    const approvedSenders = [...company.approvedSenders, address];
    await this.prisma.company.update({
      where: { id: companyId },
      data: { approvedSenders },
    });

    return { approvedSenders };
  }

  /** Sum of non-pending Recipient rows across this company's campaigns, this calendar month. */
  async getMonthlySentCount(companyId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    return this.prisma.recipient.count({
      where: {
        campaign: { companyId },
        status: { not: 'pending' },
        sentAt: { gte: startOfMonth },
      },
    });
  }
}
