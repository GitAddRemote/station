import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class RefreshTokenAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.cookies?.refresh_token as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    // The JTI is embedded in the refresh token value ({jti}.{randomhex}),
    // so we can always recover it from the cookie alone — the access token
    // cookie is not required and may already be expired.
    const jti = this.authService.parseRefreshTokenJti(refreshToken);
    if (!jti) {
      throw new UnauthorizedException('Malformed refresh token');
    }

    request.user = { refreshToken, jti };
    return true;
  }
}
