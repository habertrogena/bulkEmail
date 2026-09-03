import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { SuppressionService } from './suppression.service';
import { AddSuppressionDto } from './dto/add-suppression.dto';

@Controller('suppression')
@UseGuards(JwtAuthGuard)
export class SuppressionController {
  constructor(private readonly suppressionService: SuppressionService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.suppressionService.list(user.companyId);
  }

  @Post()
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddSuppressionDto) {
    return this.suppressionService.add(
      user.companyId,
      dto.email,
      'manual_unsubscribe',
    );
  }
}
