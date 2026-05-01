import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SCOPES_KEY = 'requiredScopes';

export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRE_SCOPES_KEY, scopes);
