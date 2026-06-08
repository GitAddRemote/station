import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationInventoryListItem } from './entities/station-inventory-list-item.entity';
import { StationInventoryList } from './entities/station-inventory-list.entity';
import { StationUnitOfMeasure } from './entities/station-unit-of-measure.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StationUnitOfMeasure,
      StationInventoryItem,
      StationInventoryList,
      StationInventoryListItem,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class InventoryModule {}
