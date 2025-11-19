import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as figlet from 'figlet';
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Application configuration
  const port = process.env.PORT || 3001;
  const appName = process.env.APP_NAME || 'STATION BACKEND';

  // ASCII Art for Application Name
  console.log(figlet.textSync(appName, { horizontalLayout: 'full' }));

  // Enable CORS (if needed for APIs)
  app.enableCors();

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

  // Global Response Transform Interceptor for standardized success responses
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger/OpenAPI Documentation Setup
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
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Log application startup information
  await app.listen(port);
  Logger.log(
    `🚀 Application '${appName}' is running on: http://localhost:${port}`,
    'Bootstrap',
  );
  Logger.log(
    `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

bootstrap();
