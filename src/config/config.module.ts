import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './env/env.validation';
import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import redisConfig from './redis.config';
import queueConfig from './queue.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate,
      expandVariables: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, queueConfig],
    }),
  ],
})
export class AppConfigModule {}
