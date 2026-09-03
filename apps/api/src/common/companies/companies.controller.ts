import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { CompaniesService } from './companies.service';
import { AddDomainDto } from './dto/add-domain.dto';
import { AddSenderDto } from './dto/add-sender.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.getProfile(user.companyId);
  }

  @Post('domain')
  addDomain(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddDomainDto) {
    return this.companiesService.addDomain(user.companyId, dto.domain);
  }

  @Get('domain/status')
  getDomainStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.getDomainStatus(user.companyId);
  }

  @Post('senders')
  addSender(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddSenderDto) {
    return this.companiesService.addSender(user.companyId, dto.address);
  }
}
