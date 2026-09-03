import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
import { CompaniesService } from '../companies/companies.service';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
    private companies: CompaniesService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);

    const { user, company } = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.companyName },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash: hashed,
          companyId: company.id,
          role: 'owner',
        },
      });

      return { user, company };
    });

    try {
      await this.companies.provisionConfigurationSet(company.id);
    } catch (error) {
      // Don't fail registration over SES being unreachable/misconfigured —
      // the company is usable without a configuration set, just without
      // delivery/bounce/complaint tracking until it's provisioned.
      this.logger.warn(
        `Failed to provision SES configuration set for company ${company.id}: ${String(error)}`,
      );
    }

    return {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException("User doesn't exist");

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Wrong password');

    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    };
    const token = this.jwt.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }

  /**
   * Forgot password: generate reset token, store on user, and send reset link by email.
   * Requires SMTP_* env vars. In dev without SMTP, resetLink is returned in the response.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const message =
      'If an account exists with this email, you will receive a reset link.';

    if (!user) {
      return { message };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL ?? 'http://localhost:3200'}/reset-password?token=${token}`;

    if (this.mail.isConfigured()) {
      await this.mail.sendResetLink(user.email, resetLink);
      return { message };
    }

    if (process.env.NODE_ENV !== 'production') {
      return { message, resetLink };
    }

    return { message };
  }

  /**
   * Reset password: validate token and set new password.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password has been reset. You can now log in.' };
  }
}
