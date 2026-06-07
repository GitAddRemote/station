import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationCatalogCategory } from './entities/station-catalog-category.entity';
import { CatalogCategoryTreeService } from './services/catalog-category-tree.service';

@Module({
  imports: [TypeOrmModule.forFeature([StationCatalogCategory])],
  providers: [CatalogCategoryTreeService],
  exports: [CatalogCategoryTreeService, TypeOrmModule],
})
export class CatalogModule {}
