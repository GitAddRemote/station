import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { UexSyncService } from './uex-sync.service';
import { UexSyncController } from './uex-sync.controller';
import { UexSyncState } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';
import { UexCategory } from '../uex/entities/uex-category.entity';
import { UexItem } from '../uex/entities/uex-item.entity';
import { UEXCategoriesClient } from './clients/uex-categories.client';
import { UEXItemsClient } from './clients/uex-items.client';
import { CategoriesSyncService } from './services/categories-sync.service';
import { ItemsSyncService } from './services/items-sync.service';
import { UEXSyncScheduler } from './schedulers/uex-sync.scheduler';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UexSyncState,
      UexSyncConfig,
      UexCategory,
      UexItem,
    ]),
    HttpModule,
    UsersModule,
  ],
  controllers: [UexSyncController],
  providers: [
    UexSyncService,
    UEXCategoriesClient,
    UEXItemsClient,
    CategoriesSyncService,
    ItemsSyncService,
    UEXSyncScheduler,
  ],
  exports: [UexSyncService, CategoriesSyncService, ItemsSyncService],
})
export class UexSyncModule {}
