import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { ClientJwtPayload } from '../interfaces/client-jwt-payload.interface';

/**
 * Checks that the client token attached by ClientAuthGuard holds all scopes
 * listed in the @RequireScopes decorator. Must be used after ClientAuthGuard.
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { clientToken?: ClientJwtPayload }>();
    const tokenScopes = req.clientToken?.scopes ?? [];

    const missing = required.filter((s) => !tokenScopes.includes(s));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required scopes: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
