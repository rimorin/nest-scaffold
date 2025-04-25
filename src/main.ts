import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

/**
 * Bootstraps the NestJS application.
 *
 * This function initializes the NestJS application with:
 * - Global validation pipe for DTO validation
 * - URI-based API versioning (e.g. /v1/auth/login)
 * - Swagger API documentation with bearer auth support
 * - Cookie parser middleware for handling HTTP cookies
 *
 * The application listens on the port specified in the configuration,
 * or defaults to port 3000 if not specified.
 *
 * @returns {Promise<void>} A promise that resolves when the application has successfully started.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable cookie-parser middleware for handling cookies
  // Using signed cookies for additional security
  app.use(cookieParser(configService.get('app.cookieSecret', 'your-secret-key')));

  // Set up a console logger with JSON output and colors. For production, consider using a winston logger with file transport
  app.useLogger(
    new ConsoleLogger({
      json: true,
      colors: true,
    }),
  );

  // Set up global validation pipe for all routes
  app.useGlobalPipes(
    new ValidationPipe({
      // Remove any properties that don't have decorators in the DTO
      // This protects against mass assignment vulnerabilities by stripping
      // unexpected properties from request payloads
      whitelist: true,

      // Throw an error if non-whitelisted properties are present
      // This makes validation stricter by rejecting requests with unknown properties
      // forbidNonWhitelisted: true,

      // Automatically transform payloads to match DTO types
      // This converts primitive types and performs type coercion when possible
      // transform: true,

      // Sets validation error messages to be returned when validation fails
      // Provides detailed feedback on what validation rules failed
      // enableDebugMessages: configService.get('app.env') !== 'production',

      // Prevents validation errors from leaking implementation details in production
      // disableErrorMessages: configService.get('app.env') === 'production',

      // Validates nested objects within DTOs
      // validateCustomDecorators: true,
    }),
  );

  // Enable URI-based versioning for the application
  // This prefixes routes with version information (e.g., /v1/auth/login)
  // Benefits:
  // - Allows simultaneous support of multiple API versions
  // - Provides clear client expectations through explicit versioning
  // - Enables non-breaking API evolution in production environments
  // - Facilitates gradual migration of clients to newer API versions
  app.enableVersioning();

  // Allows the application to gracefully handle shutdown signals
  // This registers listeners for SIGTERM and SIGINT (Ctrl+C) signals
  app.enableShutdownHooks();

  // Set up a global exception filter to catch unhandled exceptions
  // This filter logs errors and sends standardized error responses to clients
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable CORS with environment-specific settings
  const isDevelopment = configService.get('app.env') !== 'production';
  app.enableCors(
    isDevelopment
      ? {
          // Development: permissive settings
          origin: '*',
          methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
          allowedHeaders: 'Content-Type, Accept, Authorization',
          credentials: true,
          exposedHeaders: ['Content-Type', 'Accept'],
          maxAge: 3600,
          optionsSuccessStatus: 200,
        }
      : {
          // Production: restrictive settings
          origin: configService.get('app.allowedOrigins', 'https://yourdomain.com')?.split(','),
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true,
          maxAge: 86400, // 24 hours
        },
  );
  // Configure Swagger documentation
  // This sets up API documentation that's accessible via browser
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('The API documentation for the NestJS scaffold project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // Generate and serve Swagger documentation at /api endpoint
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start the HTTP server on the specified port
  const port = configService.get('app.port', 3000);
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

// Properly handle the promise to address the no-floating-promises warning
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
