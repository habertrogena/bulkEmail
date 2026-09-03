import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddRecipientsDto } from './dto/add-recipients.dto';
import { ListRecipientsDto } from './dto/list-recipients.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.campaignsService.listCampaigns(user.companyId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.createCampaign(user.companyId, dto);
  }

  @Post(':id/recipients')
  addRecipients(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddRecipientsDto,
  ) {
    return this.campaignsService.addRecipients(user.companyId, id, dto.csv);
  }

  @Post(':id/send')
  send(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.sendCampaign(user.companyId, id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.getCampaign(user.companyId, id);
  }

  @Get(':id/recipients')
  listRecipients(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListRecipientsDto,
  ) {
    return this.campaignsService.listRecipients(user.companyId, id, query);
  }
}
