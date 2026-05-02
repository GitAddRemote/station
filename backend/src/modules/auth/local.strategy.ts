import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly logger: Logger,
    private readonly authService: AuthService,
  ) {
    super({
      usernameField: 'username', // in case you're using email instead
      passwordField: 'password',
    });
  }

  async validate(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    this.logger.debug(`Validating user: ${username}`);

    const user = await this.authService.validateUser(username, password);
    if (!user) {
      this.logger.warn(`Invalid login attempt for user: ${username}`);
      throw new UnauthorizedException('Invalid username or password');
    }

    this.logger.debug(`Login successful for user: ${username}`);
    return user; // forwarded to AuthController.login() via request.user
  }
}
