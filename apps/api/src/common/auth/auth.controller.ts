import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PinoLogger } from 'nestjs-pino';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt.guard';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite:
    process.env.NODE_ENV === 'production'
      ? ('none' as const)
      : ('strict' as const),
  path: '/',
  maxAge: 1000 * 60 * 60, // 1 hour
  // Without this, the cookie defaults to being scoped to the exact host that
  // set it — the API's own subdomain (e.g. bulkmailapi.okwiyatech.co.ke) —
  // and is never sent on requests to the frontend's or admin app's own
  // Next.js servers on their different subdomains. Their middleware
  // (proxy.ts) checks for this cookie to decide whether to redirect to
  // /login, so without a shared Domain it never sees a logged-in user and
  // redirects every protected route back to /login in a loop, even though
  // login itself succeeded and the cookie is correctly set on the API's own
  // domain. Set COOKIE_DOMAIN to the shared parent domain (e.g.
  // ".okwiyatech.co.ke") in production so all *.okwiyatech.co.ke subdomains
  // can read it. Left unset in local dev, where everything is on localhost
  // and no Domain attribute is needed.
  domain: process.env.COOKIE_DOMAIN || undefined,
};

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly logger: PinoLogger,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.login(dto);

    res.cookie('accessToken', token, COOKIE_OPTIONS);
    this.logger.info({ userId: user.id }, 'Login successful');

    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', {
      path: COOKIE_OPTIONS.path,
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      domain: COOKIE_OPTIONS.domain,
    });
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user?.sub;

    if (!userId) {
      return null;
    }

    return this.authService.me(userId);
  }
}
