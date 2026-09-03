import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { CompaniesModule } from '../companies/companies.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { SesModule } from '../ses/ses.module';

@Module({
  imports: [CompaniesModule, CampaignsModule, SesModule],
  controllers: [AdminController],
  providers: [AdminService, PlatformAdminGuard],
})
export class AdminModule {}
