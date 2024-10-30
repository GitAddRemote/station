import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as figlet from 'figlet';
import * as dotenv from 'dotenv';

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

  // Global Middleware or Filters can be applied here, e.g., a Global Validation Pipe

  // Log application startup information
  await app.listen(port);
  Logger.log(`🚀 Application '${appName}' is running on: http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
