import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { AdminService } from './admin.service';
import { UpdateLimitDto } from './dto/update-limit.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('companies')
  listCompanies() {
    return this.adminService.listCompanies();
  }

  @Get('companies/:id')
  getCompanyDetail(@Param('id') id: string) {
    return this.adminService.getCompanyDetail(id);
  }

  @Post('companies/:id/suspend')
  suspend(@Param('id') id: string) {
    return this.adminService.suspendCompany(id);
  }

  @Post('companies/:id/unsuspend')
  unsuspend(@Param('id') id: string) {
    return this.adminService.unsuspendCompany(id);
  }

  @Patch('companies/:id/limit')
  updateLimit(@Param('id') id: string, @Body() dto: UpdateLimitDto) {
    return this.adminService.updateLimit(id, dto);
  }

  @Get('reputation')
  getReputation() {
    return this.adminService.getReputation();
  }

  @Get('aws-health')
  getAwsHealth() {
    return this.adminService.getAwsHealth();
  }
}
