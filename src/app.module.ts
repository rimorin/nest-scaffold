import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskModule } from './task/task.module';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME,
      },
      // Optional default job options
      defaultJobOptions: {
        attempts: parseInt(process.env.BULL_JOB_ATTEMPTS || '3'),
        removeOnComplete: parseInt(process.env.BULL_REMOVE_ON_COMPLETE || '100'),
        removeOnFail: parseInt(process.env.BULL_REMOVE_ON_FAIL || '200'),
      },
    }),
    AuthModule,
    UsersModule,
    PrismaModule,
    TaskModule,
    QueueModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
