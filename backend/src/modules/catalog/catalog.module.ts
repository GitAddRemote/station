import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { StationCatalogCategory } from './entities/station-catalog-category.entity';
import { StationCatalogEntry } from './entities/station-catalog-entry.entity';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { CatalogCategoryTreeService } from './services/catalog-category-tree.service';
import { StationUnitOfMeasure } from '../inventory/entities/station-unit-of-measure.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StationCatalogCategory,
      StationCatalogEntry,
      StationUnitOfMeasure,
    ]),
  ],
  controllers: [CatalogController, UnitsOfMeasureController],
  providers: [CatalogCategoryTreeService, CatalogService],
  exports: [CatalogCategoryTreeService, CatalogService, TypeOrmModule],
})
export class CatalogModule {}
