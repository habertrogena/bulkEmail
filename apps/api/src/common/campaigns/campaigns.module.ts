import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CompaniesModule } from '../companies/companies.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [CompaniesModule, QueueModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
