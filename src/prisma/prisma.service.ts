import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma service that provides database connection management
 * Extends PrismaClient to provide ORM functionality throughout the application
 * Handles connection lifecycle based on NestJS module lifecycle events
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('database.url'),
        },
      },
    });
  }

  /**
   * Connects to the database when the module is initialized
   * Automatically called by NestJS when the module is initialized
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnects from the database when the module is destroyed
   * Automatically called by NestJS during application shutdown
   * Ensures proper cleanup of database connections
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
