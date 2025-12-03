import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { SystemUserService } from './system-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, SystemUserService],
  controllers: [UsersController],
  exports: [UsersService, SystemUserService],
})
export class UsersModule {}
