import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTestDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5433'),
  username: process.env.DATABASE_USER || 'stationDbUser',
  password: process.env.DATABASE_PASSWORD || 'stationDbPassword1',
  database: process.env.DATABASE_NAME || 'stationDb',
  entities: ['src/**/*.entity.ts'],
  synchronize: true, // OK for tests
  dropSchema: true, // Clean slate for each test run
  logging: false,
});

export const getTestJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'test-jwt-secret-key';
};
