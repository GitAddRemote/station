/**
 * JWT payload structure for access tokens
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: number;
  /** Username */
  username: string;
  /** JWT ID — unique identifier used for per-token blacklisting on logout */
  jti: string;
  /** Session ID — stable across token rotations; deleting session:{sid} in
   *  Redis invalidates all access tokens from this login, including any issued
   *  after a concurrent refresh that raced with logout */
  sid: string;
  /** Issued at timestamp (optional, added by JWT) */
  iat?: number;
  /** Expiration timestamp (optional, added by JWT) */
  exp?: number;
}
