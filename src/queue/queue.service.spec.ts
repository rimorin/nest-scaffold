import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('QueueService', () => {
  let service: QueueService;
  let queueMock: {
    add: jest.Mock;
    getJob: jest.Mock;
    getWaiting: jest.Mock;
    getActive: jest.Mock;
    getCompleted: jest.Mock;
    getFailed: jest.Mock;
    getWaitingCount: jest.Mock;
    getActiveCount: jest.Mock;
    getCompletedCount: jest.Mock;
    getFailedCount: jest.Mock;
  };

  beforeEach(async () => {
    queueMock = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('generic-queue'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add a job to the queue', async () => {
    const jobData = { test: 'data' };
    const jobOptions = { priority: 1 };
    const mockJob = { id: 'job123' };

    queueMock.add.mockResolvedValue(mockJob);

    const result = await service.addJob('test-job', jobData, jobOptions);

    expect(queueMock.add).toHaveBeenCalledWith('test-job', jobData, jobOptions);
    expect(result).toBe(mockJob);
  });

  it('should get a job by id', async () => {
    const mockJob = { id: 'job123' };
    queueMock.getJob.mockResolvedValue(mockJob);

    const result = await service.getJob('job123');

    expect(queueMock.getJob).toHaveBeenCalledWith('job123');
    expect(result).toBe(mockJob);
  });

  it('should get waiting jobs', async () => {
    const mockJobs = [{ id: 'job1' }, { id: 'job2' }];
    queueMock.getWaiting.mockResolvedValue(mockJobs);

    const result = await service.getWaitingJobs();

    expect(queueMock.getWaiting).toHaveBeenCalled();
    expect(result).toEqual(mockJobs);
  });

  it('should get active jobs', async () => {
    const mockJobs = [{ id: 'job1' }, { id: 'job2' }];
    queueMock.getActive.mockResolvedValue(mockJobs);

    const result = await service.getActiveJobs();

    expect(queueMock.getActive).toHaveBeenCalled();
    expect(result).toEqual(mockJobs);
  });

  it('should get completed jobs', async () => {
    const mockJobs = [{ id: 'job1' }, { id: 'job2' }];
    queueMock.getCompleted.mockResolvedValue(mockJobs);

    const result = await service.getCompletedJobs();

    expect(queueMock.getCompleted).toHaveBeenCalled();
    expect(result).toEqual(mockJobs);
  });

  it('should get failed jobs', async () => {
    const mockJobs = [{ id: 'job1' }, { id: 'job2' }];
    queueMock.getFailed.mockResolvedValue(mockJobs);

    const result = await service.getFailedJobs();

    expect(queueMock.getFailed).toHaveBeenCalled();
    expect(result).toEqual(mockJobs);
  });

  it('should get queue stats', async () => {
    queueMock.getWaitingCount.mockResolvedValue(5);
    queueMock.getActiveCount.mockResolvedValue(3);
    queueMock.getCompletedCount.mockResolvedValue(10);
    queueMock.getFailedCount.mockResolvedValue(2);

    const result = await service.getQueueStats();

    expect(queueMock.getWaitingCount).toHaveBeenCalled();
    expect(queueMock.getActiveCount).toHaveBeenCalled();
    expect(queueMock.getCompletedCount).toHaveBeenCalled();
    expect(queueMock.getFailedCount).toHaveBeenCalled();
    expect(result).toEqual({
      waiting: 5,
      active: 3,
      completed: 10,
      failed: 2,
      total: 20,
    });
  });
});
