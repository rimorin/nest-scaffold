import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  @Cron(CronExpression.EVERY_HOUR)
  handleCron() {
    this.logger.debug(
      'Called when the current time matches the time specified in the cron expression',
    );
  }
}
