import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthInvite } from '../auth/auth-invite.entity';
import { AuthInvitesService } from './auth-invites.service';
import { AuthInvitesController } from './auth-invites.controller';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuthInvite]), UsersModule],
  controllers: [AuthInvitesController],
  providers: [AuthInvitesService, SuperAdminGuard],
  exports: [AuthInvitesService],
})
export class AuthInvitesModule {}
