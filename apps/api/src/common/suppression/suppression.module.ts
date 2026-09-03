import { Module } from '@nestjs/common';
import { SuppressionService } from './suppression.service';
import { SuppressionController } from './suppression.controller';
import { UnsubscribeController } from './unsubscribe.controller';

@Module({
  controllers: [SuppressionController, UnsubscribeController],
  providers: [SuppressionService],
  exports: [SuppressionService],
})
export class SuppressionModule {}
