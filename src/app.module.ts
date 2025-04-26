import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskModule } from './task/task.module';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { AppConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

/**
 * Main application module that integrates all the feature modules and core services.
 *
 * Configuration overview:
 * - AppConfigModule: Centralizes all application configuration
 * - CacheModule: Redis-based caching system with configurable TTL and size
 * - BullModule: Background job processing queue using Redis
 * - ScheduleModule: Handles scheduled tasks and cron jobs
 * - AuthModule: Handles authentication and authorization
 * - PrismaModule: Database ORM connectivity and management
 * - Global guards: JwtAuthGuard protects all endpoints by default
 * - Global interceptors: CacheInterceptor for automatic response caching
 */
@Module({
  imports: [
    // Load configuration module first to make settings available to other modules
    AppConfigModule,

    // Configure Redis-based caching with settings from configuration
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        isGlobal: configService.get('cache.isGlobal', true),
        ttl: configService.get('cache.ttl', 5000),
        max: configService.get('cache.max', 100),
        stores: [
          new KeyvRedis(
            `redis://${configService.get('redis.host', 'localhost')}:${configService.get('redis.port', 6379)}`,
          ),
        ],
      }),
      inject: [ConfigService],
    }),

    // Configure BullMQ queue system with Redis connection details
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

    // Enable scheduled tasks using NestJS scheduler
    ScheduleModule.forRoot(),

    // Feature modules
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
    // Apply JWT authentication globally across all routes
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Enable automatic response caching across the application
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
