import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { SesModule } from '../ses/ses.module';
import { SesService } from '../ses/ses.service';
import { EmailProviderModule } from '../email-provider/email-provider.module';
import { EMAIL_SENDING_QUEUE } from './queue.constants';
import { EmailSendingProcessor } from './email-sending.processor';

const DEFAULT_MAX_SEND_RATE = 1; // SES sandbox default; safe fallback

@Module({
  imports: [
    SesModule,
    EmailProviderModule,
    BullModule.forRoot({
      connection: new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
      }),
    }),
    BullModule.registerQueueAsync({
      name: EMAIL_SENDING_QUEUE,
      imports: [SesModule],
      inject: [SesService],
      useFactory: async (ses: SesService) => {
        // This single queue's rate limit is tuned off SES's account quota
        // even though Resend-backed companies also flow through it — SES's
        // sandbox-safe default (1/sec) is well below Resend's own limits, so
        // it never throttles Resend sends, just SES ones. A per-provider
        // queue/limiter would be needed if that stops being true.
        const envRate = process.env.SES_MAX_SEND_RATE
          ? Number(process.env.SES_MAX_SEND_RATE)
          : undefined;
        const maxSendRate =
          envRate ?? (await ses.getMaxSendRate()) ?? DEFAULT_MAX_SEND_RATE;

        return {
          limiter: {
            max: Math.max(1, Math.floor(maxSendRate)),
            duration: 1000,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
    }),
  ],
  providers: [EmailSendingProcessor],
  exports: [BullModule],
})
export class QueueModule {}
