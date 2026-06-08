import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationCatalogEntry } from '../catalog/entities/station-catalog-entry.entity';
import { StationLocation } from '../locations/entities/station-location.entity';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationUnitOfMeasure } from './entities/station-unit-of-measure.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StationCatalogEntry,
      StationLocation,
      StationUnitOfMeasure,
      StationInventoryItem,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class InventoryModule {}
