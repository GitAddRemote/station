import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guards the admin /oauth-clients endpoint with a static API key supplied via
 * the INTERNAL_API_KEY environment variable. This endpoint is not public — it
 * is called only from deployment automation or an admin shell.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.configService.get<string>('INTERNAL_API_KEY');
    if (!apiKey) {
      throw new UnauthorizedException(
        'INTERNAL_API_KEY is not configured on this server',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided =
      req.headers['x-internal-api-key'] ??
      req.headers['authorization']?.replace(/^ApiKey\s+/i, '');

    if (provided !== apiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
