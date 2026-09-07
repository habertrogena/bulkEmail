import { Controller, Get, Header, HttpCode, Param, Post } from '@nestjs/common';
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

  /**
   * One-click unsubscribe per RFC 8058 — mail clients (Gmail, Yahoo, etc.)
   * POST here directly when a user clicks "Unsubscribe" in their inbox UI,
   * triggered by the List-Unsubscribe-Post header we send with every email.
   * No confirmation page, just a 2xx.
   */
  @Post(':token')
  @HttpCode(200)
  async unsubscribeOneClick(@Param('token') token: string): Promise<void> {
    await this.suppressionService.unsubscribeByToken(token);
  }
}
