import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { UserDto } from '../users/dto/user.dto';
import { Request as ExpressRequest } from 'express';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: ExpressRequest) {
    return this.authService.login(req.user);
  }

  // Registration Route: No guards required
  @Post('register')
  async register(@Body() userDto: UserDto) {
    return this.authService.register(userDto);
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
