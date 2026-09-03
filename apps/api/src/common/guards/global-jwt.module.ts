import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Expiry in seconds; default 1 hour, minimum 60s to avoid accidental 1s tokens
const parsed = process.env.JWT_EXPIRES_IN
  ? parseInt(process.env.JWT_EXPIRES_IN, 10)
  : NaN;
const JWT_EXPIRES_IN_SEC = Number.isNaN(parsed) || parsed < 60 ? 3600 : parsed;

// Global so every feature module's JwtAuthGuard resolves the same configured
// JwtService without each module re-declaring JwtModule.register(...).
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: JWT_EXPIRES_IN_SEC,
      },
    }),
  ],
  exports: [JwtModule],
})
export class GlobalJwtModule {}
