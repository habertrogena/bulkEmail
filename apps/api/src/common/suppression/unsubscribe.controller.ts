import { Controller, Get, Header, Param } from '@nestjs/common';
import { SuppressionService } from './suppression.service';

@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private readonly suppressionService: SuppressionService) {}

  @Get(':token')
  @Header('Content-Type', 'text/html')
  async unsubscribe(@Param('token') token: string): Promise<string> {
    const ok = await this.suppressionService.unsubscribeByToken(token);
    return ok
      ? '<p>You have been unsubscribed and will not receive further emails from this sender.</p>'
      : '<p>This unsubscribe link is invalid or has expired.</p>';
  }
}
