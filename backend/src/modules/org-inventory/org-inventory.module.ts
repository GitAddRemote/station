import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgInventoryItem } from './entities/org-inventory-item.entity';
import { OrgInventoryService } from './org-inventory.service';
import { OrgInventoryController } from './org-inventory.controller';
import { OrgInventoryRepository } from './org-inventory.repository';
import { PermissionsModule } from '../permissions/permissions.module';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';
import { UexItem } from '../uex/entities/uex-item.entity';
import { Location } from '../locations/entities/location.entity';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrgInventoryItem,
      User,
      Game,
      UexItem,
      Location,
      Organization,
    ]),
    PermissionsModule,
  ],
  controllers: [OrgInventoryController],
  providers: [OrgInventoryService, OrgInventoryRepository],
  exports: [OrgInventoryService, OrgInventoryRepository],
})
export class OrgInventoryModule {}
