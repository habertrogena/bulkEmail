import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SesService } from '../ses/ses.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ses: SesService,
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

  private buildDkimInstructions(domain: string, dkimTokens: string[]) {
    return dkimTokens.map((token) => ({
      type: 'CNAME',
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
    }));
  }

  async addDomain(companyId: string, domain: string) {
    const result = await this.ses.createEmailIdentity(domain);
    const dkimTokens = result.DkimAttributes?.Tokens ?? [];

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        sendingDomain: domain,
        domainVerified: false,
        dkimTokens,
      },
    });

    return {
      domain,
      dkimTokens,
      instructions: this.buildDkimInstructions(domain, dkimTokens),
    };
  }

  async getProfile(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const dkimTokens = (company.dkimTokens as string[] | null) ?? [];

    return {
      sendingDomain: company.sendingDomain,
      domainVerified: company.domainVerified,
      approvedSenders: company.approvedSenders,
      planTier: company.planTier,
      monthlyEmailLimit: company.monthlyEmailLimit,
      dkimTokens,
      instructions: company.sendingDomain
        ? this.buildDkimInstructions(company.sendingDomain, dkimTokens)
        : [],
    };
  }

  async getDomainStatus(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    if (!company.sendingDomain) {
      return { sendingDomain: null, domainVerified: false };
    }

    const result = await this.ses.getEmailIdentity(company.sendingDomain);
    const verified =
      result.VerifiedForSendingStatus === true ||
      result.DkimAttributes?.Status === 'SUCCESS';

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

    if (!onVerifiedCompanyDomain && !onPlatformDomain) {
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
