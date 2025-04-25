import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  // Database
  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  // JWT
  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'default_secret';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '60m';

  // Cookie settings
  @IsString()
  @IsOptional()
  COOKIE_SECRET: string = 'cookie-secret';

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  // CORS settings
  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string;

  // Redis
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  REDIS_USERNAME?: string;

  // BullMQ
  @IsNumber()
  @IsOptional()
  BULL_JOB_ATTEMPTS: number = 3;

  @IsNumber()
  @IsOptional()
  BULL_REMOVE_ON_COMPLETE: number = 100;

  @IsNumber()
  @IsOptional()
  BULL_REMOVE_ON_FAIL: number = 200;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
