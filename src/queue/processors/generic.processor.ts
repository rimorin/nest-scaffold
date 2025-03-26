import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('generic-queue')
export class GenericProcessor extends WorkerHost {
  private readonly logger = new Logger(GenericProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type: ${job.name}`);
    this.logger.log(`Job data: ${JSON.stringify(job.data)}`);

    // Simple job processing logic
    // You can expand this as needed in the future
    await this.simulateProcessing();

    return {
      processed: true,
      jobId: job.id,
      completedAt: new Date(),
    };
  }

  private async simulateProcessing(): Promise<void> {
    // Simulate some work being done
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
