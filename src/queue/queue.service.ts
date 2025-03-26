import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';

/**
 * QueueService provides an abstraction for working with background job processing.
 *
 * Purpose:
 * - Handles asynchronous processing of tasks that don't need immediate execution
 * - Offloads CPU-intensive operations from the request-response cycle
 * - Improves application responsiveness by delegating time-consuming tasks
 * - Provides reliability through job persistence and automatic retries
 * - Enables horizontal scaling of job processing
 *
 * Common use cases:
 * - Email sending
 * - File processing
 * - Report generation
 * - Third-party API integration
 * - Data imports/exports
 * - Scheduled tasks
 */
@Injectable()
export class QueueService {
  constructor(@InjectQueue('generic-queue') private genericQueue: Queue) {}

  /**
   * Adds a job to the generic queue for asynchronous processing.
   *
   * @param name - Descriptive name/type of the job (e.g., 'send-email', 'generate-report')
   * @param data - The data payload to be processed by the worker
   * @param options - Optional BullMQ job configuration options
   * @returns The created job object with ID and other metadata
   *
   * @example
   * // Basic usage
   * queueService.addJob('send-email', { to: 'user@example.com', subject: 'Hello' });
   *
   * @example
   * // With options
   * queueService.addJob('generate-report', { reportId: 123 }, {
   *   priority: 10,
   *   delay: 60000, // 1 minute delay
   *   attempts: 3,  // retry up to 3 times
   *   backoff: { type: 'exponential', delay: 1000 }
   * });
   */
  async addJob(name: string, data: any, options?: JobsOptions) {
    return this.genericQueue.add(name, data, options);
  }

  /**
   * Retrieves a job by its unique ID.
   * Useful for checking job status or result after processing.
   *
   * @param jobId - The unique identifier of the job to retrieve
   * @returns The job if found, null otherwise
   *
   * @example
   * const job = await queueService.getJob('1234');
   * const status = await job?.getState(); // 'completed', 'failed', 'active', etc.
   * const result = job?.returnvalue; // The result returned by the job processor
   */
  async getJob(jobId: string) {
    return this.genericQueue.getJob(jobId);
  }

  /**
   * Gets all jobs in the waiting state (queued but not yet processed).
   * Useful for monitoring and administrative purposes.
   *
   * @returns Array of waiting jobs
   */
  async getWaitingJobs() {
    return this.genericQueue.getWaiting();
  }

  /**
   * Gets all jobs currently being processed.
   * Useful for monitoring active workload.
   *
   * @returns Array of active jobs
   */
  async getActiveJobs() {
    return this.genericQueue.getActive();
  }

  /**
   * Gets all successfully completed jobs.
   * These jobs may be automatically removed based on removeOnComplete setting.
   *
   * @returns Array of completed jobs
   */
  async getCompletedJobs() {
    return this.genericQueue.getCompleted();
  }

  /**
   * Gets all failed jobs.
   * These represent tasks that couldn't be processed even after retry attempts.
   * Failed jobs can be manually retried or analyzed for debugging.
   *
   * @returns Array of failed jobs
   */
  async getFailedJobs() {
    return this.genericQueue.getFailed();
  }

  /**
   * Gets queue statistics including counts of jobs in different states.
   * Useful for monitoring and dashboards.
   *
   * @returns Object with counts of waiting, active, completed, failed and total jobs
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.genericQueue.getWaitingCount(),
      this.genericQueue.getActiveCount(),
      this.genericQueue.getCompletedCount(),
      this.genericQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }
}
