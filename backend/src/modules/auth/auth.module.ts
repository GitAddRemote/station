import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService, REDIS_CLIENT } from './auth.service';
import { TokenCleanupService } from './token-cleanup.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PasswordReset } from './password-reset.entity';
import { RefreshTokenAuthGuard } from './refresh-token-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([PasswordReset]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenCleanupService,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenAuthGuard,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const useRedis =
          configService.get<string>('USE_REDIS_CACHE', 'true') === 'true';
        if (!useRedis) return null;

        const client = createClient({
          socket: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        });

        try {
          await client.connect();
          return client;
        } catch {
          return null;
        }
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
