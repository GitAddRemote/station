import { Request } from 'express';

export interface RefreshTokenUser {
  refreshToken: string;
  jti: string;
}

export interface RefreshTokenRequest extends Request {
  user: RefreshTokenUser;
}
