import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SesService } from '../ses/ses.service';
import { UpdateLimitDto } from './dto/update-limit.dto';

const REPUTATION_WINDOW_DAYS = 30;
const BOUNCE_RATE_THRESHOLD = 0.05;
const COMPLAINT_RATE_THRESHOLD = 0.001;

export interface DailyRate {
  date: string;
  sent: number;
  bounceRate: number;
  complaintRate: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
    private readonly campaigns: CampaignsService,
    private readonly ses: SesService,
  ) {}

  async listCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const startOfMonth = this.startOfMonth();

    const [usage, campaignsSentThisMonth] = await Promise.all([
      Promise.all(
        companies.map((c) => this.companies.getMonthlySentCount(c.id)),
      ),
      Promise.all(
        companies.map((c) =>
          this.prisma.campaign.count({
            where: {
              companyId: c.id,
              status: { in: ['sending', 'completed'] },
              sentAt: { gte: startOfMonth },
            },
          }),
        ),
      ),
    ]);

    return companies.map((company, i) => ({
      id: company.id,
      name: company.name,
      sendingDomain: company.sendingDomain,
      domainVerified: company.domainVerified,
      planTier: company.planTier,
      monthlyEmailLimit: company.monthlyEmailLimit,
      monthlyUsage: usage[i],
      campaignsSentThisMonth: campaignsSentThisMonth[i],
      suspended: company.suspended,
      createdAt: company.createdAt,
    }));
  }

  async getCompanyDetail(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        role: true,
        isPlatformAdmin: true,
        createdAt: true,
      },
    });

    const campaignHistory = await this.campaigns.listCampaigns(companyId);
    const series = await this.getDailyRateSeries(companyId);

    return { company, users, campaigns: campaignHistory, series };
  }

  async suspendCompany(companyId: string) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: { suspended: true },
    });
  }

  async unsuspendCompany(companyId: string) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: { suspended: false },
    });
  }

  async updateLimit(companyId: string, dto: UpdateLimitDto) {
    if (dto.monthlyEmailLimit === undefined && dto.planTier === undefined) {
      throw new BadRequestException(
        'At least one of monthlyEmailLimit or planTier is required',
      );
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.monthlyEmailLimit !== undefined && {
          monthlyEmailLimit: dto.monthlyEmailLimit,
        }),
        ...(dto.planTier !== undefined && { planTier: dto.planTier }),
      },
    });
  }

  async getReputation() {
    const since = this.daysAgo(REPUTATION_WINDOW_DAYS);

    const companies = await this.prisma.company.findMany({
      select: { id: true, name: true, sendingDomain: true },
    });

    const recipients = await this.prisma.recipient.findMany({
      where: { status: { not: 'pending' }, sentAt: { gte: since } },
      select: { status: true, campaign: { select: { companyId: true } } },
    });

    const stats = new Map<
      string,
      { sent: number; bounced: number; complained: number }
    >(companies.map((c) => [c.id, { sent: 0, bounced: 0, complained: 0 }]));

    for (const recipient of recipients) {
      const bucket = stats.get(recipient.campaign.companyId);
      if (!bucket) continue;
      bucket.sent++;
      if (recipient.status === 'bounced') bucket.bounced++;
      if (recipient.status === 'complained') bucket.complained++;
    }

    const result = companies.map((company) => {
      const bucket = stats.get(company.id)!;
      const bounceRate = bucket.sent ? bucket.bounced / bucket.sent : 0;
      const complaintRate = bucket.sent ? bucket.complained / bucket.sent : 0;
      return {
        companyId: company.id,
        name: company.name,
        sendingDomain: company.sendingDomain,
        sent: bucket.sent,
        bounceRate,
        complaintRate,
        atRisk:
          bounceRate > BOUNCE_RATE_THRESHOLD ||
          complaintRate > COMPLAINT_RATE_THRESHOLD,
      };
    });

    result.sort((a, b) => b.bounceRate - a.bounceRate);
    return result;
  }

  async getAwsHealth() {
    return this.ses.getAccountHealth();
  }

  private startOfMonth(): Date {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private async getDailyRateSeries(companyId: string): Promise<DailyRate[]> {
    const since = this.daysAgo(REPUTATION_WINDOW_DAYS);

    const recipients = await this.prisma.recipient.findMany({
      where: {
        campaign: { companyId },
        status: { not: 'pending' },
        sentAt: { gte: since },
      },
      select: { status: true, sentAt: true },
    });

    const buckets = new Map<
      string,
      { sent: number; bounced: number; complained: number }
    >();
    for (let i = 0; i < REPUTATION_WINDOW_DAYS; i++) {
      const day = new Date(since);
      day.setUTCDate(day.getUTCDate() + i);
      buckets.set(day.toISOString().slice(0, 10), {
        sent: 0,
        bounced: 0,
        complained: 0,
      });
    }

    for (const recipient of recipients) {
      const key = recipient.sentAt!.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.sent++;
      if (recipient.status === 'bounced') bucket.bounced++;
      if (recipient.status === 'complained') bucket.complained++;
    }

    return Array.from(buckets.entries()).map(([date, bucket]) => ({
      date,
      sent: bucket.sent,
      bounceRate: bucket.sent ? bucket.bounced / bucket.sent : 0,
      complaintRate: bucket.sent ? bucket.complained / bucket.sent : 0,
    }));
  }
}
