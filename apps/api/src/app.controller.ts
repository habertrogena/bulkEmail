import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Unauthenticated liveness check for the reverse proxy / deploy verification. */
  @Get('health')
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
