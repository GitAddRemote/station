import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

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

    // Normalize to a single string first — Express can return string | string[].
    const normalize = (h: string | string[] | undefined): string =>
      Array.isArray(h) ? (h[0] ?? '') : (h ?? '');

    const provided = normalize(req.headers['x-internal-api-key']);

    const providedBuf = Buffer.from(provided);
    const apiKeyBuf = Buffer.from(apiKey);
    let valid = false;
    try {
      valid =
        providedBuf.length === apiKeyBuf.length &&
        timingSafeEqual(providedBuf, apiKeyBuf);
    } catch {
      // Length mismatch or other error — treat as invalid.
    }
    if (!valid) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
