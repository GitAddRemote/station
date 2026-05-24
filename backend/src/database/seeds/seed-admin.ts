import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeederAdminModule } from './database-seeder-admin.module';
import { DatabaseSeederAdminService } from './database-seeder-admin.service';
import { User } from '../../modules/users/user.entity';

// Minimal module: only DB + config + the seeder. No Redis, no auth stack.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [User],
        synchronize: false,
        extra: { parseInt8: true },
      }),
      inject: [ConfigService],
    }),
    DatabaseSeederAdminModule,
  ],
})
class SeedAdminAppModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedAdminAppModule, {
    logger: ['error', 'warn'],
  });

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
