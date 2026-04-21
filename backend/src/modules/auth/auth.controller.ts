import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenAuthGuard } from './refresh-token-auth.guard';
import { UserDto } from '../users/dto/user.dto';
import { Request as ExpressRequest, Response } from 'express';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password-reset.dto';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { RefreshTokenRequest } from './interfaces/refresh-token-request.interface';
import { ValidatedUser } from './interfaces/validated-user.interface';

// Parse throttle config once at module load time.
// Number() handles numeric strings and NaN from non-numeric input; the
// isFinite guard ensures an invalid env var falls back to the safe default
// rather than silently producing 0 or NaN-driven throttle windows.
const toThrottleInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const LOGIN_TTL = toThrottleInt(
  process.env['AUTH_LOGIN_THROTTLE_TTL_MS'],
  60_000,
);
const LOGIN_LIMIT = toThrottleInt(process.env['AUTH_LOGIN_THROTTLE_LIMIT'], 10);
const REGISTER_TTL = toThrottleInt(
  process.env['AUTH_REGISTER_THROTTLE_TTL_MS'],
  60_000,
);
const REGISTER_LIMIT = toThrottleInt(
  process.env['AUTH_REGISTER_THROTTLE_LIMIT'],
  5,
);
const FORGOT_TTL = toThrottleInt(
  process.env['AUTH_FORGOT_THROTTLE_TTL_MS'],
  60_000,
);
const FORGOT_LIMIT = toThrottleInt(
  process.env['AUTH_FORGOT_THROTTLE_LIMIT'],
  5,
);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge,
    };
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { ttl: LOGIN_TTL, limit: LOGIN_LIMIT } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Request() req: ExpressRequest & { user: ValidatedUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(req.user);
    res.cookie(
      'access_token',
      tokens.accessToken,
      this.cookieOptions(15 * 60 * 1000),
    );
    res.cookie(
      'refresh_token',
      tokens.refreshToken,
      this.cookieOptions(7 * 24 * 60 * 60 * 1000),
    );
    return { message: 'Login successful', username: req.user.username };
  }

  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Throttle({ default: { ttl: REGISTER_TTL, limit: REGISTER_LIMIT } })
  @Post('register')
  async register(@Body() userDto: UserDto) {
    return this.authService.register(userDto);
  }

  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: AuthenticatedRequest) {
    return { id: req.user.userId, username: req.user.username };
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @UseGuards(RefreshTokenAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Request() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshAccessToken(
      req.user.refreshToken,
    );
    res.cookie(
      'access_token',
      tokens.accessToken,
      this.cookieOptions(15 * 60 * 1000),
    );
    res.cookie(
      'refresh_token',
      tokens.refreshToken,
      this.cookieOptions(7 * 24 * 60 * 60 * 1000),
    );
    return { message: 'Tokens refreshed successfully' };
  }

  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @UseGuards(RefreshTokenAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Request() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeRefreshToken(req.user.refreshToken);
    const { maxAge: _maxAge, ...clearOpts } = this.cookieOptions(0);
    res.clearCookie('access_token', clearOpts);
    res.clearCookie('refresh_token', clearOpts);
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description:
      'If an account with that email exists, a password reset link has been sent',
  })
  @Throttle({ default: { ttl: FORGOT_TTL, limit: FORGOT_LIMIT } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(forgotPasswordDto.email);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(token, newPassword);
  }

  @ApiOperation({ summary: 'Change password (requires authentication)' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = changePasswordDto;
    return this.authService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
  }
}
