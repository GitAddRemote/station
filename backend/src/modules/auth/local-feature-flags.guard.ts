import {
  Injectable,
  ForbiddenException,
  ExecutionContext,
  CanActivate,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalLoginEnabledGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const enabled =
      this.configService.get<string>('AUTH_LOCAL_LOGIN_ENABLED', 'true') ===
      'true';
    if (!enabled) {
      throw new ForbiddenException('Local login is disabled');
    }
    return true;
  }
}

@Injectable()
export class LocalRegisterEnabledGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const enabled =
      this.configService.get<string>('AUTH_LOCAL_REGISTER_ENABLED', 'true') ===
      'true';
    if (!enabled) {
      throw new ForbiddenException('Local registration is disabled');
    }
    return true;
  }
}
