import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bullmq';
import { GenericProcessor } from './processors/generic.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'generic-queue',
    }),
  ],
  providers: [QueueService, GenericProcessor],
  exports: [QueueService],
})
export class QueueModule {}
