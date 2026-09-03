import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Must run after JwtAuthGuard (relies on req.user.sub). Re-reads
 * isPlatformAdmin from the DB on every request rather than trusting a JWT
 * claim, so revoking admin access takes effect immediately rather than only
 * once the token expires.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req['user'] as { sub?: string } | undefined)?.sub;

    if (!userId) {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
