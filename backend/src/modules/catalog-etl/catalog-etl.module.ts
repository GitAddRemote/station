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
import { CitiesSyncStep } from './steps/cities-sync.step';
import { SpaceStationsSyncStep } from './steps/space-stations-sync.step';
import { OutpostsSyncStep } from './steps/outposts-sync.step';
import { PoisSyncStep } from './steps/pois-sync.step';
import { JumpPointsSyncStep } from './steps/jump-points-sync.step';
import { CategoriesSyncStep } from './steps/categories-sync.step';
import { TerminalsSyncStep } from './steps/terminals-sync.step';
import { TerminalDistancesSyncStep } from './steps/terminal-distances-sync.step';
import { VehiclesSyncStep } from './steps/vehicles-sync.step';
import { ItemsSyncStep } from './steps/items-sync.step';
import { CommoditiesSyncStep } from './steps/commodities-sync.step';
import { CatalogEtlScheduler } from './schedulers/catalog-etl.scheduler';
import { UexSyncModule } from '../uex-sync/uex-sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([EtlRun, EtlWarning]), UexSyncModule],
  controllers: [CatalogEtlController],
  providers: [
    CatalogEtlService,
    CatalogEtlScheduler,
    AdvisoryLockService,
    FactionsSyncStep,
    JurisdictionsSyncStep,
    CompaniesSyncStep,
    StarSystemsSyncStep,
    OrbitsSyncStep,
    PlanetsSyncStep,
    MoonsSyncStep,
    CitiesSyncStep,
    SpaceStationsSyncStep,
    OutpostsSyncStep,
    PoisSyncStep,
    JumpPointsSyncStep,
    CategoriesSyncStep,
    TerminalsSyncStep,
    TerminalDistancesSyncStep,
    VehiclesSyncStep,
    ItemsSyncStep,
    CommoditiesSyncStep,
  ],
  exports: [CatalogEtlService],
})
export class CatalogEtlModule {}
