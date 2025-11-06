import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrganizationRolesService } from './user-organization-roles.service';
import { UserOrganizationRolesController } from './user-organization-roles.controller';
import { UserOrganizationRole } from './user-organization-role.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrganizationRole, User, Organization, Role])],
  providers: [UserOrganizationRolesService],
  controllers: [UserOrganizationRolesController],
  exports: [UserOrganizationRolesService],
})
export class UserOrganizationRolesModule {}
