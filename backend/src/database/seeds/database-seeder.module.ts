import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';
import { Game } from '../../modules/games/game.entity';
import { OrgInventoryItem } from '../../modules/org-inventory/entities/org-inventory-item.entity';
import { Location } from '../../modules/locations/entities/location.entity';
import { UexItem } from '../../modules/uex/entities/uex-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Organization,
      User,
      UserOrganizationRole,
      Game,
      OrgInventoryItem,
      Location,
      UexItem,
    ]),
  ],
  providers: [DatabaseSeederService],
  exports: [DatabaseSeederService],
})
export class DatabaseSeederModule {}
