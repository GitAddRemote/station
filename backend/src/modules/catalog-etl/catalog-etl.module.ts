import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogEtlService } from './catalog-etl.service';
import { CatalogEtlController } from './catalog-etl.controller';
import { EtlRun } from './entities/etl-run.entity';
import { EtlWarning } from './entities/etl-warning.entity';
import { AdvisoryLockService } from '../../common/services';
import { FactionsSyncStep } from './steps/factions-sync.step';
import { JurisdictionsSyncStep } from './steps/jurisdictions-sync.step';
import { CompaniesSyncStep } from './steps/companies-sync.step';
import { StarSystemsSyncStep } from './steps/star-systems-sync.step';
import { OrbitsSyncStep } from './steps/orbits-sync.step';
import { PlanetsSyncStep } from './steps/planets-sync.step';
import { MoonsSyncStep } from './steps/moons-sync.step';
import { UexSyncModule } from '../uex-sync/uex-sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([EtlRun, EtlWarning]), UexSyncModule],
  controllers: [CatalogEtlController],
  providers: [
    CatalogEtlService,
    AdvisoryLockService,
    FactionsSyncStep,
    JurisdictionsSyncStep,
    CompaniesSyncStep,
    StarSystemsSyncStep,
    OrbitsSyncStep,
    PlanetsSyncStep,
    MoonsSyncStep,
  ],
  exports: [CatalogEtlService],
})
export class CatalogEtlModule {}
