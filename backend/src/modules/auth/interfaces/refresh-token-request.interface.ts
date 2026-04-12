import { Request } from 'express';

/**
 * User object attached to request after refresh token authentication
 */
export interface RefreshTokenUser {
  refreshToken: string;
}

/**
 * Express request with refresh token
 * Used after RefreshTokenAuthGuard validates the request
 */
export interface RefreshTokenRequest extends Request {
  user: RefreshTokenUser;
}
