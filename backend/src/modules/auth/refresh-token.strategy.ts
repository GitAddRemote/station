import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { AuthService } from './auth.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(token: string) {
    // The token is already extracted by passport-http-bearer
    // We just need to return it so it's available in the request
    return { refreshToken: token };
  }
}
