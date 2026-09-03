import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GlobalJwtModule } from './guards/global-jwt.module';
import { CompaniesModule } from './companies/companies.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { QueueModule } from './queue/queue.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SuppressionModule } from './suppression/suppression.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    GlobalJwtModule,
    PrismaModule,
    AuthModule,
    CompaniesModule,
    CampaignsModule,
    QueueModule,
    WebhooksModule,
    SuppressionModule,
    AdminModule,
  ],
})
export class CommonModule {}
