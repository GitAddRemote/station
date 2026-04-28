import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class RefreshTokenAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.cookies?.refresh_token as string | undefined;
    const accessToken = request.cookies?.access_token as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    // Decode the access token without verifying expiry to extract the JTI.
    // The JTI ties the refresh token entry in Redis to this token pair.
    let jti: string | undefined;
    if (accessToken) {
      try {
        const decoded = this.jwtService.decode(
          accessToken,
        ) as JwtPayload | null;
        jti = decoded?.jti;
      } catch {
        // malformed access token — jti stays undefined
      }
    }

    if (!jti) {
      throw new UnauthorizedException('Unable to identify token pair');
    }

    request.user = { refreshToken, jti };
    return true;
  }
}
