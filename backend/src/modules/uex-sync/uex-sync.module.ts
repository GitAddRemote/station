import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UexSyncService } from './uex-sync.service';
import { UexSyncController } from './uex-sync.controller';
import { UexSyncState } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UexSyncState, UexSyncConfig])],
  controllers: [UexSyncController],
  providers: [UexSyncService],
  exports: [UexSyncService],
})
export class UexSyncModule {}
