import { Request } from 'express';

/**
 * User object attached to request after JWT authentication
 */
export interface AuthenticatedUser {
  userId: number;
  username: string;
}

/**
 * Express request with authenticated user
 * Used after JwtAuthGuard validates the request
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
