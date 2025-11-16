import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { UserDto } from '../users/dto/user.dto';
import { RefreshToken } from './refresh-token.entity';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHash =
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8WZ0p/7eJYJg6eW9j5Cnz4Gf5Eme1e';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    const trimmedPass = pass.trim();

    const hashToCompare = user?.password ?? this.dummyHash;
    const isMatch = await bcrypt.compare(trimmedPass, hashToCompare);

    if (user && isMatch) {
      const { password: _password, ...result } = user;
      return result;
    }

    this.logger.warn(`Authentication failed for user: ${username}`);
    return null;
  }

  async login(
    user: any,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async register(userDto: UserDto): Promise<Omit<User, 'password'>> {
    // Don't hash here any more—UsersService.create() will do it.
    const newUser = await this.usersService.create(userDto);
    const { password: _password, ...result } = newUser;
    return result;
  }

  async generateRefreshToken(userId: number): Promise<string> {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save to database
    await this.refreshTokenRepository.save({
      token,
      userId,
      expiresAt,
      revoked: false,
    });

    return token;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    // Find the refresh token
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired or revoked
    if (storedToken.revoked || new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Revoke the old token (rotation)
    await this.refreshTokenRepository.update(storedToken.id, {
      revoked: true,
    });

    // Generate new tokens
    const payload = {
      username: storedToken.user.username,
      sub: storedToken.user.id,
    };
    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(
      storedToken.user.id,
    );

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update({ token }, { revoked: true });
  }
}
