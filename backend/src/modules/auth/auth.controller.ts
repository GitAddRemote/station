import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
  Headers,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
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
import { TokenRequestDto } from './dto/token-request.dto';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { RefreshTokenRequest } from './interfaces/refresh-token-request.interface';
import { ValidatedUser } from './interfaces/validated-user.interface';
import { OauthClientsService } from '../oauth-clients/oauth-clients.service';

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
const TOKEN_TTL = toThrottleInt(
  process.env['AUTH_TOKEN_THROTTLE_TTL_MS'],
  60_000,
);
const TOKEN_LIMIT = toThrottleInt(process.env['AUTH_TOKEN_THROTTLE_LIMIT'], 10);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private oauthClientsService: OauthClientsService,
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

  @ApiOperation({
    summary: 'OAuth 2.0 Client Credentials token endpoint (M2M)',
    description:
      'Accepts JSON body or application/x-www-form-urlencoded. ' +
      'Client credentials may also be supplied via Authorization: Basic <base64(client_id:client_secret)> ' +
      'with grant_type in the body.',
  })
  @ApiBody({ type: TokenRequestDto })
  @ApiResponse({ status: 200, description: 'Access token issued' })
  @ApiResponse({ status: 401, description: 'Invalid client credentials' })
  @Throttle({ default: { ttl: TOKEN_TTL, limit: TOKEN_LIMIT } })
  @HttpCode(HttpStatus.OK)
  @Post('token')
  async token(
    @Body() dto: TokenRequestDto,
    @Headers('authorization') rawAuthHeader?: string | string[],
  ) {
    // Normalize: Express can produce string | string[] for a header value.
    const authHeader = Array.isArray(rawAuthHeader)
      ? rawAuthHeader[0]
      : rawAuthHeader;

    // RFC 6749 §2.3.1: client may authenticate via Authorization: Basic
    // base64(client_id:client_secret) instead of body parameters.
    let clientId = dto.client_id;
    let clientSecret = dto.client_secret;

    if (authHeader?.match(/^basic /i)) {
      const encoded = authHeader.slice(authHeader.indexOf(' ') + 1).trim();
      const decoded = Buffer.from(encoded, 'base64').toString();
      const colon = decoded.indexOf(':');
      if (colon < 1) {
        throw new UnauthorizedException('Malformed Basic authorization header');
      }
      clientId = decoded.substring(0, colon);
      clientSecret = decoded.substring(colon + 1);
    }

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        'Client credentials required: supply client_id and client_secret in the body or via Authorization: Basic',
      );
    }

    const client = await this.oauthClientsService.validateClient(
      clientId,
      clientSecret,
    );

    // An absent scope parameter grants the full registered set (RFC 6749 §4.4.2).
    // When a scope parameter is present, every requested scope must be in the
    // client's registered set — silently dropping unknown scopes would let callers
    // mint tokens without realising their scope request was partially ignored.
    const parsedScopes = dto.scope
      ? dto.scope.split(' ').filter(Boolean)
      : null;
    // Treat a whitespace-only scope string (e.g. scope="+") as absent so it
    // falls back to the client's full registered set rather than minting an
    // empty-scope token.
    const requestedScopes =
      parsedScopes && parsedScopes.length > 0 ? parsedScopes : null;

    if (requestedScopes) {
      const unauthorized = requestedScopes.filter(
        (s) => !client.scopes.includes(s),
      );
      if (unauthorized.length > 0) {
        throw new UnauthorizedException(
          'Requested scope is not permitted for this client',
        );
      }
    }

    const grantedScopes = requestedScopes ?? client.scopes;

    return this.authService.issueClientToken(client, grantedScopes);
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
    return { userId: req.user.userId, username: req.user.username };
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
      req.user.jti,
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
    const rawAccessToken = req.cookies?.access_token as string | undefined;
    await this.authService.logout(
      req.user.refreshToken,
      req.user.jti,
      rawAccessToken,
    );

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
