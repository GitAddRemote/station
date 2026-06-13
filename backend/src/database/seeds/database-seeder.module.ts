import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';
import { Game } from '../../modules/games/game.entity';
import { BusinessUnit } from '../../modules/business-units/business-unit.entity';
import { StationInventoryItem } from '../../modules/inventory/entities/station-inventory-item.entity';
import { Contract } from '../../modules/contracts/entities/contract.entity';
import { ContractItem } from '../../modules/contracts/entities/contract-item.entity';
import { ContractMilestone } from '../../modules/contracts/entities/contract-milestone.entity';
import { ContractParty } from '../../modules/contracts/entities/contract-party.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Organization,
      User,
      UserOrganizationRole,
      Game,
      BusinessUnit,
      StationInventoryItem,
      Contract,
      ContractItem,
      ContractMilestone,
      ContractParty,
    ]),
  ],
  providers: [DatabaseSeederService],
  exports: [DatabaseSeederService],
})
export class DatabaseSeederModule {}
