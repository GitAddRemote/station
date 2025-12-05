import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { UexSyncService } from './uex-sync.service';
import { UexSyncController } from './uex-sync.controller';
import { UexSyncState } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';
import { UexCategory } from '../uex/entities/uex-category.entity';
import { UexItem } from '../uex/entities/uex-item.entity';
import { UexStarSystem } from '../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../uex/entities/uex-planet.entity';
import { UexMoon } from '../uex/entities/uex-moon.entity';
import { UexCity } from '../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../uex/entities/uex-outpost.entity';
import { UexPoi } from '../uex/entities/uex-poi.entity';
import { UEXCategoriesClient } from './clients/uex-categories.client';
import { UEXItemsClient } from './clients/uex-items.client';
import { UEXLocationsClient } from './clients/uex-locations.client';
import { CategoriesSyncService } from './services/categories-sync.service';
import { ItemsSyncService } from './services/items-sync.service';
import { LocationsSyncService } from './services/locations-sync.service';
import { UEXSyncScheduler } from './schedulers/uex-sync.scheduler';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UexSyncState,
      UexSyncConfig,
      UexCategory,
      UexItem,
      UexStarSystem,
      UexPlanet,
      UexMoon,
      UexCity,
      UexSpaceStation,
      UexOutpost,
      UexPoi,
    ]),
    HttpModule,
    UsersModule,
  ],
  controllers: [UexSyncController],
  providers: [
    UexSyncService,
    UEXCategoriesClient,
    UEXItemsClient,
    UEXLocationsClient,
    CategoriesSyncService,
    ItemsSyncService,
    LocationsSyncService,
    UEXSyncScheduler,
  ],
  exports: [
    UexSyncService,
    CategoriesSyncService,
    ItemsSyncService,
    LocationsSyncService,
  ],
})
export class UexSyncModule {}
