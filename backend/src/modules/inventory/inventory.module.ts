import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsModule } from '../../metrics/metrics.module';
import { StationCatalogEntry } from '../catalog/entities/station-catalog-entry.entity';
import { StationLocation } from '../locations/entities/station-location.entity';
import { Organization } from '../organizations/organization.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserOrganizationRolesModule } from '../user-organization-roles/user-organization-roles.module';
import { User } from '../users/user.entity';
import { StationInventoryBatch } from './entities/station-inventory-batch.entity';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationInventoryListItem } from './entities/station-inventory-list-item.entity';
import { StationInventoryList } from './entities/station-inventory-list.entity';
import { StationUnitOfMeasure } from './entities/station-unit-of-measure.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    MetricsModule,
    PermissionsModule,
    UserOrganizationRolesModule,
    TypeOrmModule.forFeature([
      User,
      Organization,
      StationCatalogEntry,
      StationLocation,
      StationUnitOfMeasure,
      StationInventoryBatch,
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
