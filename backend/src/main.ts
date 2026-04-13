import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as figlet from 'figlet';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Application configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3001;
  const appName = configService.get<string>('APP_NAME') || 'STATION BACKEND';

  // ASCII Art for Application Name
  console.log(figlet.textSync(appName, { horizontalLayout: 'full' }));

  // Cookie parser — must be registered before guards that read cookies
  app.use(cookieParser());

  // CORS — allow credentials so httpOnly cookies are sent cross-origin
  app.enableCors({
    origin:
      configService.get<string>('ALLOWED_ORIGIN') || 'http://localhost:5173',
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
  if (process.env.NODE_ENV !== 'production') {
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
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Log application startup information
  await app.listen(port);
  Logger.log(
    `Application '${appName}' is running on: http://localhost:${port}`,
    'Bootstrap',
  );
  if (process.env.NODE_ENV !== 'production') {
    Logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

bootstrap();
