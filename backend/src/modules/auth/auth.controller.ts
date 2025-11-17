import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { RefreshTokenAuthGuard } from './refresh-token-auth.guard';
import { UserDto } from '../users/dto/user.dto';
import { Request as ExpressRequest } from 'express';
import * as bcrypt from 'bcrypt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: ExpressRequest) {
    return this.authService.login(req.user);
  }

  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  // Registration Route: No guards required
  @Post('register')
  async register(@Body() userDto: UserDto) {
    return this.authService.register(userDto);
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBearerAuth('refresh-token')
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @UseGuards(RefreshTokenAuthGuard)
  @Post('refresh')
  async refresh(@Request() req: any) {
    const refreshToken = req.user.refreshToken;
    return this.authService.refreshAccessToken(refreshToken);
  }

  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  @ApiBearerAuth('refresh-token')
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @UseGuards(RefreshTokenAuthGuard)
  @Post('logout')
  async logout(@Request() req: any) {
    const refreshToken = req.user.refreshToken;
    await this.authService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('test')
  async testBCrypt() {
    (async () => {
      const plainPassword = 'securePassword123';
      const saltRounds = 10;

      // Simulate Registration
      const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
      console.log('Plain password:', plainPassword);
      console.log('Hashed password:', hashedPassword);

      // Simulate Login
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      console.log('Passwords match:', isMatch);
      return isMatch;
    })();
  }
}
