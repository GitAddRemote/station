import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInventoryItem } from './entities/user-inventory-item.entity';
import { UserInventoryService } from './user-inventory.service';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';
import { UexItem } from '../uex/entities/uex-item.entity';
import { Location } from '../locations/entities/location.entity';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserInventoryItem,
      User,
      Game,
      UexItem,
      Location,
      Organization,
    ]),
  ],
  providers: [UserInventoryService],
  exports: [UserInventoryService],
})
export class UserInventoryModule {}
