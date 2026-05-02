import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ClientJwtPayload } from '../interfaces/client-jwt-payload.interface';
import { AuthService } from '../auth.service';

/**
 * Accepts requests carrying a valid client JWT (type === 'client').
 * Attaches the decoded payload to request.clientToken for downstream guards.
 */
@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('No bearer token provided');
    }

    let payload: ClientJwtPayload;
    try {
      payload = this.jwtService.verify<ClientJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'client') {
      throw new UnauthorizedException('Token is not a client token');
    }

    if (await this.authService.isAccessTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    (req as Request & { clientToken: ClientJwtPayload }).clientToken = payload;
    return true;
  }

  private extractToken(req: Request): string | null {
    const auth = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    if (auth?.match(/^bearer /i)) {
      return auth.slice(auth.indexOf(' ') + 1).trim();
    }
    return null;
  }
}
