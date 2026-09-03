import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { verifyUnsubscribeToken } from './unsubscribe-token';

@Injectable()
export class SuppressionService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.suppressionEntry.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  add(companyId: string, email: string, reason: string) {
    return this.prisma.suppressionEntry.upsert({
      where: { companyId_email: { companyId, email } },
      update: {},
      create: { companyId, email, reason },
    });
  }

  async unsubscribeByToken(token: string): Promise<boolean> {
    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) return false;

    await this.add(decoded.companyId, decoded.email, 'manual_unsubscribe');
    return true;
  }
}
