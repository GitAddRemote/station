/**
 * JWT payload structure for access tokens
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: number;
  /** Username */
  username: string;
  /** Issued at timestamp (optional, added by JWT) */
  iat?: number;
  /** Expiration timestamp (optional, added by JWT) */
  exp?: number;
}
