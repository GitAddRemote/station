import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { UexSyncService } from './uex-sync.service';
import { UexSyncController } from './uex-sync.controller';
import { UexSyncState } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';
import { UexCategory } from '../uex/entities/uex-category.entity';
import { UexCommodity } from '../uex/entities/uex-commodity.entity';
import { UexItem } from '../uex/entities/uex-item.entity';
import { UexStarSystem } from '../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../uex/entities/uex-planet.entity';
import { UexMoon } from '../uex/entities/uex-moon.entity';
import { UexCity } from '../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../uex/entities/uex-outpost.entity';
import { UexPoi } from '../uex/entities/uex-poi.entity';
import { UexCompany } from '../uex/entities/uex-company.entity';
import { UEXCategoriesClient } from './clients/uex-categories.client';
import { UEXCommoditiesClient } from './clients/uex-commodities.client';
import { UEXItemsClient } from './clients/uex-items.client';
import { UEXCompaniesClient } from './clients/uex-companies.client';
import { UexApiClient } from './clients/uex-api.client';
import { CategoriesSyncService } from './services/categories-sync.service';
import { CommoditiesSyncService } from './services/commodities-sync.service';
import { ItemsSyncService } from './services/items-sync.service';
import { CompaniesSyncService } from './services/companies-sync.service';
import { UEXSyncScheduler } from './schedulers/uex-sync.scheduler';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UexSyncState,
      UexSyncConfig,
      UexCategory,
      UexCommodity,
      UexItem,
      UexStarSystem,
      UexPlanet,
      UexMoon,
      UexCity,
      UexSpaceStation,
      UexOutpost,
      UexPoi,
      UexCompany,
    ]),
    HttpModule,
    UsersModule,
  ],
  controllers: [UexSyncController],
  providers: [
    UexSyncService,
    UEXCategoriesClient,
    UEXCommoditiesClient,
    UEXItemsClient,
    UEXCompaniesClient,
    {
      provide: UexApiClient,
      useFactory: (configService: ConfigService, logger: PinoLogger) =>
        new UexApiClient(logger, {
          baseUrl: configService.get(
            'UEX_API_BASE_URL',
            'https://uexcorp.space/api/2.0',
          ),
          requestDelayMs: configService.get<number>(
            'UEX_REQUEST_DELAY_MS',
            500,
          ),
          timeoutMs: configService.get<number>('UEX_TIMEOUT_MS', 30000),
        }),
      inject: [ConfigService, getLoggerToken(UexApiClient.name)],
    },
    CategoriesSyncService,
    CommoditiesSyncService,
    ItemsSyncService,
    CompaniesSyncService,
    UEXSyncScheduler,
  ],
  exports: [
    UexSyncService,
    CategoriesSyncService,
    CommoditiesSyncService,
    ItemsSyncService,
    UexApiClient,
  ],
})
export class UexSyncModule {}
