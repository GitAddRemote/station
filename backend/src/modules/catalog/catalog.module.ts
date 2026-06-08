import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { StationCatalogCategory } from './entities/station-catalog-category.entity';
import { StationCatalogEntry } from './entities/station-catalog-entry.entity';
import { CatalogCategoryTreeService } from './services/catalog-category-tree.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StationCatalogCategory, StationCatalogEntry]),
  ],
  controllers: [CatalogController],
  providers: [CatalogCategoryTreeService, CatalogService],
  exports: [CatalogCategoryTreeService, CatalogService, TypeOrmModule],
})
export class CatalogModule {}
