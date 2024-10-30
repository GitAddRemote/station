import { Controller, Post, UseGuards, Request, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserDto } from '../users/dto/user.dto';
import { Request as ExpressRequest } from 'express';

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
}
