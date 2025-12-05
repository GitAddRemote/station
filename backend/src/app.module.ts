import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-yet';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UserOrganizationRolesModule } from './modules/user-organization-roles/user-organization-roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { DatabaseSeederModule } from './database/seeds/database-seeder.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { GamesModule } from './modules/games/games.module';
import { UexModule } from './modules/uex/uex.module';
import { UexSyncModule } from './modules/uex-sync/uex-sync.module';
import { LocationsModule } from './modules/locations/locations.module';
import { UserInventoryModule } from './modules/user-inventory/user-inventory.module';

const isTest =
  process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

const conditionalImports: DynamicModule[] = [];

// Only load ScheduleModule in non-test environments to avoid hanging processes
if (!isTest) {
  conditionalImports.push(ScheduleModule.forRoot());
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ...conditionalImports,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const useRedis =
          configService.get<string>('USE_REDIS_CACHE', 'true') === 'true';

        if (!useRedis) {
          return {
            store: 'memory',
            ttl: 300000,
            max: 100,
            // Disable interval cleanup to avoid open handles in tests
            checkperiod: 0,
            isCacheableValue: () => true,
          };
        }

        try {
          const store = await redisStore({
            socket: {
              host: configService.get<string>('REDIS_HOST', 'localhost'),
              port: configService.get<number>('REDIS_PORT', 6379),
            },
            ttl: 300000, // 5 minutes default TTL in milliseconds
          });
          console.log('✅ Redis cache connected successfully');
          return { store };
        } catch (error: any) {
          console.warn(
            '⚠️  Redis connection failed, using in-memory cache:',
            error?.message || error,
          );
          // Fall back to in-memory cache if Redis is not available
          return {
            ttl: 300000,
            max: 100,
          };
        }
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isTest =
          process.env.NODE_ENV === 'test' ||
          process.env.JEST_WORKER_ID !== undefined;

        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          autoLoadEntities: true,
          synchronize: isTest, // Auto-create tables for tests, false for production
          dropSchema: isTest, // Clean database before each test run
          migrations: ['dist/migrations/*.js'],
          migrationsRun: false, // Run migrations manually for safety
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    RolesModule,
    OrganizationsModule,
    UserOrganizationRolesModule,
    PermissionsModule,
    DatabaseSeederModule,
    AuditLogsModule,
    GamesModule,
    UexModule,
    UexSyncModule,
    LocationsModule,
    UserInventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
