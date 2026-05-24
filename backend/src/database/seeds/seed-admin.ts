import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DatabaseSeederAdminService } from './database-seeder-admin.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seeder = app.get(DatabaseSeederAdminService);

  try {
    await seeder.seedAdmin();
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Admin seeding failed:', error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
