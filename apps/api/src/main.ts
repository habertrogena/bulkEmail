import './env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';

const REQUIRED_ENV = [
  'JWT_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error(`Missing required env: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // SNS posts the SES webhook as text/plain (its JSON body must be verified
  // against the exact raw bytes), so parse it as raw text before the global
  // JSON parser — which would otherwise skip it anyway based on content-type,
  // but this keeps the raw string available as req.body for signature checks.
  app.use('/webhooks/ses', express.text({ type: '*/*', limit: '5mb' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const isDev = process.env.NODE_ENV !== 'production';
  const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;
  const origins = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : isDev
      ? ['http://localhost:3200', 'http://127.0.0.1:3200']
      : [];
  if (!isDev && origins.length === 0) {
    console.warn(
      'Production: set CORS_ORIGIN or FRONTEND_URL so the frontend can call the API.',
    );
  }
  app.enableCors({
    origin: origins.length ? origins : false,
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  const port = process.env.PORT ?? 4500;
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
