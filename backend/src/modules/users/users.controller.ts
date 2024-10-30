import { Controller, Get, Param, ParseIntPipe, Post, Put, Patch, Delete, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getUsers() {
    return await this.usersService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('username/:username')
  async getUserByUsername(@Param('username') username: string) {
    return await this.usersService.findOne(username);
  }

  // POST request to create a new user
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createUser(@Body() userDto: UserDto) {
    return this.usersService.create(userDto);
  }

  // PUT request to update user by ID
  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() userDto: Partial<UserDto>) {
    return await this.usersService.update(id, userDto);
  }

  // PATCH request to partially update user by ID
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async partialUpdateUser(@Param('id', ParseIntPipe) id: number, @Body() userDto: Partial<UserDto>) {
    return await this.usersService.update(id, userDto);
  }

  // DELETE request to delete user by ID
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(204)
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usersService.delete(id);
  }
}
