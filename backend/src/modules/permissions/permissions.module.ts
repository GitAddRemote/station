import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrganizationRole])],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}
