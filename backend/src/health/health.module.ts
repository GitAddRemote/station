import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { UexSyncModule } from '../modules/uex-sync/uex-sync.module';

@Module({
  imports: [TerminusModule, UexSyncModule],
  controllers: [HealthController],
})
export class HealthModule {}
