import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  bull: {
    attempts: parseInt(process.env.BULL_JOB_ATTEMPTS || '3', 10),
    removeOnComplete: parseInt(process.env.BULL_REMOVE_ON_COMPLETE || '100', 10),
    removeOnFail: parseInt(process.env.BULL_REMOVE_ON_FAIL || '200', 10),
  },
}));
