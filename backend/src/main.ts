import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as figlet from 'figlet';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Application configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3001;
  const appName = configService.get<string>('APP_NAME') ?? 'STATION BACKEND';

  const nodeEnv = configService.get<string>('NODE_ENV');
  const validNodeEnvs = ['production', 'development', 'test'] as const;
  if (
    !nodeEnv ||
    !validNodeEnvs.includes(nodeEnv as (typeof validNodeEnvs)[number])
  ) {
    throw new Error(
      `Invalid NODE_ENV value: ${nodeEnv ?? 'undefined'}. Expected one of: ${validNodeEnvs.join(', ')}`,
    );
  }
  const isProduction = nodeEnv === 'production';

  // ASCII Art for Application Name
  console.log(figlet.textSync(appName, { horizontalLayout: 'full' }));

  // Security headers — Swagger UI requires 'unsafe-inline' for scripts/styles,
  // but Swagger is disabled in production so production uses a strict CSP.
  // frameguard and hsts are set explicitly to meet security requirements.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          baseUri: [`'self'`],
          objectSrc: [`'none'`],
          scriptSrc: isProduction ? [`'self'`] : [`'self'`, `'unsafe-inline'`],
          styleSrc: isProduction ? [`'self'`] : [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https:'],
          fontSrc: [`'self'`, 'https:', 'data:'],
        },
      },
      frameguard: { action: 'deny' },
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
    }),
  );

  // CORS — require ALLOWED_ORIGIN in production; fall back to localhost in dev.
  // Use || (not ??) so a whitespace-only value is treated the same as unset.
  const allowedOrigin =
    configService.get<string>('ALLOWED_ORIGIN')?.trim() || undefined;
  if (!allowedOrigin && isProduction) {
    throw new Error('Missing required environment variable: ALLOWED_ORIGIN');
  }
  app.enableCors({
    origin: allowedOrigin ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Filter for standardized error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger/OpenAPI Documentation — development only
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Station API')
      .setDescription(
        'API documentation for Station - Gaming guild and organization management portal',
      )
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('organizations', 'Organization management endpoints')
      .addTag('roles', 'Role management endpoints')
      .addTag(
        'user-organization-roles',
        'User-Organization-Role assignment endpoints',
      )
      .addTag('permissions', 'Permission aggregation endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          name: 'Refresh Token',
          description: 'Enter refresh token',
          in: 'header',
        },
        'refresh-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Log application startup information
  await app.listen(port);
  Logger.log(
    `🚀 Application '${appName}' is running on: http://localhost:${port}`,
    'Bootstrap',
  );
  if (!isProduction) {
    Logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

bootstrap();
