export interface ClientJwtPayload {
  /** OAuth client ID (subject) */
  sub: string;
  /** Discriminates client tokens from user tokens */
  type: 'client';
  /** Granted scopes */
  scopes: string[];
  /** JWT ID — stored in Redis for revocation */
  jti: string;
  iat?: number;
  exp?: number;
}
