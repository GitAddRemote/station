import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { UexSyncService } from './uex-sync.service';
import { UexSyncController } from './uex-sync.controller';
import { UexSyncState } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';
import { UexCategory } from '../uex/entities/uex-category.entity';
import { UEXCategoriesClient } from './clients/uex-categories.client';
import { CategoriesSyncService } from './services/categories-sync.service';
import { UEXSyncScheduler } from './schedulers/uex-sync.scheduler';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UexSyncState, UexSyncConfig, UexCategory]),
    HttpModule,
    UsersModule,
  ],
  controllers: [UexSyncController],
  providers: [
    UexSyncService,
    UEXCategoriesClient,
    CategoriesSyncService,
    UEXSyncScheduler,
  ],
  exports: [UexSyncService, CategoriesSyncService],
})
export class UexSyncModule {}
