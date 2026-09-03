import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { SesModule } from '../ses/ses.module';
import { SesService } from '../ses/ses.service';
import { EMAIL_SENDING_QUEUE } from './queue.constants';
import { EmailSendingProcessor } from './email-sending.processor';

const DEFAULT_MAX_SEND_RATE = 1; // SES sandbox default; safe fallback

@Module({
  imports: [
    SesModule,
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
