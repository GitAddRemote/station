import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationCatalogEntry } from '../catalog/entities/station-catalog-entry.entity';
import { StationLocation } from '../locations/entities/station-location.entity';
import { User } from '../users/user.entity';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationInventoryListItem } from './entities/station-inventory-list-item.entity';
import { StationInventoryList } from './entities/station-inventory-list.entity';
import { StationUnitOfMeasure } from './entities/station-unit-of-measure.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      StationCatalogEntry,
      StationLocation,
      StationUnitOfMeasure,
      StationInventoryItem,
      StationInventoryList,
      StationInventoryListItem,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [TypeOrmModule, InventoryService],
})
export class InventoryModule {}
