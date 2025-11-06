import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto } from '../users/dto/user.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'username', // in case you're using email instead
      passwordField: 'password',
    });
  }

  async validate(
    username: string,
    password: string,
  ): Promise<Omit<UserDto, 'password'>> {
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
