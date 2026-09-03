import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { parse } from 'csv-parse/sync';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListRecipientsDto } from './dto/list-recipients.dto';
import { EMAIL_SENDING_QUEUE } from '../queue/queue.constants';
import type { Campaign } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
    @InjectQueue(EMAIL_SENDING_QUEUE) private readonly emailQueue: Queue,
  ) {}

  async getOwnedCampaignOrThrow(
    companyId: string,
    campaignId: string,
  ): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, companyId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  listCampaigns(companyId: string) {
    return this.prisma.campaign.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCampaign(companyId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: { ...dto, companyId },
    });
  }

  async addRecipients(companyId: string, campaignId: string, csv: string) {
    await this.getOwnedCampaignOrThrow(companyId, campaignId);

    let rows: Record<string, string>[];
    try {
      rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw new BadRequestException('Invalid CSV');
    }

    if (rows.length === 0 || !('email' in rows[0])) {
      throw new BadRequestException('CSV must have an "email" column');
    }

    const suppressed = new Set(
      (
        await this.prisma.suppressionEntry.findMany({
          where: { companyId },
          select: { email: true },
        })
      ).map((s) => s.email.toLowerCase()),
    );

    let invalidEmail = 0;
    let duplicate = 0;
    let suppressedCount = 0;

    const seen = new Set<string>();
    const recipients = rows
      .map((row) => {
        const { email, ...rest } = row;
        return { email: email?.trim(), mergeData: rest };
      })
      .filter((r) => {
        const normalized = r.email?.toLowerCase();
        if (!normalized || !isEmail(r.email)) {
          invalidEmail++;
          return false;
        }
        if (suppressed.has(normalized)) {
          suppressedCount++;
          return false;
        }
        if (seen.has(normalized)) {
          duplicate++;
          return false;
        }
        seen.add(normalized);
        return true;
      })
      .map((r) => ({
        campaignId,
        email: r.email,
        mergeData: r.mergeData,
      }));

    if (recipients.length > 0) {
      await this.prisma.$transaction([
        this.prisma.recipient.createMany({ data: recipients }),
        this.prisma.campaign.update({
          where: { id: campaignId },
          data: { totalCount: { increment: recipients.length } },
        }),
      ]);
    }

    return {
      totalRows: rows.length,
      inserted: recipients.length,
      invalidEmail,
      duplicate,
      suppressed: suppressedCount,
    };
  }

  async sendCampaign(companyId: string, campaignId: string) {
    const campaign = await this.getOwnedCampaignOrThrow(companyId, campaignId);
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    if (company.suspended) {
      throw new ForbiddenException(
        'This company is suspended and cannot send campaigns',
      );
    }
    if (campaign.status !== 'draft') {
      throw new BadRequestException(`Campaign is already ${campaign.status}`);
    }
    if (!company.approvedSenders.includes(campaign.fromAddress)) {
      throw new BadRequestException(
        'fromAddress is not an approved sender for this company',
      );
    }
    if (campaign.totalCount === 0) {
      throw new BadRequestException('Campaign has no recipients');
    }

    const monthlySent = await this.companies.getMonthlySentCount(companyId);
    if (monthlySent + campaign.totalCount > company.monthlyEmailLimit) {
      throw new BadRequestException(
        'Sending this campaign would exceed the monthly email limit',
      );
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'sending', sentAt: new Date() },
    });

    const pending = await this.prisma.recipient.findMany({
      where: { campaignId, status: 'pending' },
      select: { id: true },
    });

    await this.emailQueue.addBulk(
      pending.map((r) => ({
        name: 'send-email',
        data: { recipientId: r.id },
      })),
    );

    return { status: 'sending', enqueued: pending.length };
  }

  getCampaign(companyId: string, campaignId: string) {
    return this.getOwnedCampaignOrThrow(companyId, campaignId);
  }

  async listRecipients(
    companyId: string,
    campaignId: string,
    query: ListRecipientsDto,
  ) {
    await this.getOwnedCampaignOrThrow(companyId, campaignId);

    const where = {
      campaignId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.recipient.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { id: 'asc' },
      }),
      this.prisma.recipient.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
