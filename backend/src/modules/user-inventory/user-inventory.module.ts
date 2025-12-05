import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInventoryItem } from './entities/user-inventory-item.entity';
import { InventoryAuditLog } from './entities/inventory-audit-log.entity';
import { UserInventoryService } from './user-inventory.service';
import { InventorySharingService } from './inventory-sharing.service';
import { UserInventoryController } from './user-inventory.controller';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';
import { UexItem } from '../uex/entities/uex-item.entity';
import { Location } from '../locations/entities/location.entity';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserInventoryItem,
      InventoryAuditLog,
      User,
      Game,
      UexItem,
      Location,
      Organization,
    ]),
  ],
  controllers: [UserInventoryController],
  providers: [UserInventoryService, InventorySharingService],
  exports: [UserInventoryService, InventorySharingService],
})
export class UserInventoryModule {}
