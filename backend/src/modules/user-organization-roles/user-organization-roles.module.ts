import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrganizationRolesService } from './user-organization-roles.service';
import { UserOrganizationRolesController } from './user-organization-roles.controller';
import { UserOrganizationRole } from './user-organization-role.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';
import { BusinessUnit } from '../business-units/business-unit.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrganizationRole,
      User,
      Organization,
      Role,
      BusinessUnit,
    ]),
    forwardRef(() => AuthModule),
    UsersModule,
    PermissionsModule,
  ],
  providers: [UserOrganizationRolesService],
  controllers: [UserOrganizationRolesController],
  exports: [UserOrganizationRolesService],
})
export class UserOrganizationRolesModule {}
