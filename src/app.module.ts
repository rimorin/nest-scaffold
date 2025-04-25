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
import { AppConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          username: configService.get('redis.username'),
        },
        defaultJobOptions: {
          attempts: configService.get('queue.bull.attempts'),
          removeOnComplete: configService.get('queue.bull.removeOnComplete'),
          removeOnFail: configService.get('queue.bull.removeOnFail'),
        },
      }),
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
