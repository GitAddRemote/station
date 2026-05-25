import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlRun } from './entities/etl-run.entity';
import { EtlWarning } from './entities/etl-warning.entity';
import { EtlStep } from './interfaces/etl-step.interface';
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

@Injectable()
export class CatalogEtlService {
  protected readonly ETL_STEPS: EtlStep[];

  constructor(
    @InjectRepository(EtlRun)
    private readonly etlRunRepository: Repository<EtlRun>,
    @InjectRepository(EtlWarning)
    private readonly etlWarningRepository: Repository<EtlWarning>,
    private readonly advisoryLockService: AdvisoryLockService,
    @InjectPinoLogger(CatalogEtlService.name)
    private readonly logger: PinoLogger,
    private readonly factionsSyncStep: FactionsSyncStep,
    private readonly jurisdictionsSyncStep: JurisdictionsSyncStep,
    private readonly companiesSyncStep: CompaniesSyncStep,
    private readonly starSystemsSyncStep: StarSystemsSyncStep,
    private readonly orbitsSyncStep: OrbitsSyncStep,
    private readonly planetsSyncStep: PlanetsSyncStep,
    private readonly moonsSyncStep: MoonsSyncStep,
    private readonly citiesSyncStep: CitiesSyncStep,
    private readonly spaceStationsSyncStep: SpaceStationsSyncStep,
    private readonly outpostsSyncStep: OutpostsSyncStep,
    private readonly poisSyncStep: PoisSyncStep,
    private readonly jumpPointsSyncStep: JumpPointsSyncStep,
    private readonly categoriesSyncStep: CategoriesSyncStep,
    private readonly terminalsSyncStep: TerminalsSyncStep,
    private readonly terminalDistancesSyncStep: TerminalDistancesSyncStep,
  ) {
    this.ETL_STEPS = [
      factionsSyncStep,
      jurisdictionsSyncStep,
      starSystemsSyncStep,
      companiesSyncStep,
      orbitsSyncStep,
      planetsSyncStep,
      moonsSyncStep,
      citiesSyncStep,
      spaceStationsSyncStep,
      outpostsSyncStep,
      poisSyncStep,
      jumpPointsSyncStep,
      categoriesSyncStep,
      terminalsSyncStep,
      terminalDistancesSyncStep,
    ];
  }

  async runEtl(): Promise<EtlRun> {
    return this.advisoryLockService.withLock('catalog_etl', async () => {
      // Create the run record
      const runState = this.etlRunRepository.create({
        status: 'running',
        stepsTotal: this.ETL_STEPS.length,
        stepsSucceeded: 0,
        stepsFailed: 0,
      });
      await this.etlRunRepository.save(runState);

      this.logger.info({ runId: runState.runId }, 'ETL run started');

      for (const step of this.ETL_STEPS) {
        try {
          await step.execute({ runId: runState.runId });
          runState.stepsSucceeded++;
          this.logger.info(
            { runId: runState.runId, step: step.name },
            'ETL step succeeded',
          );
        } catch (err: unknown) {
          runState.stepsFailed++;
          const message = err instanceof Error ? err.message : String(err);

          this.logger.error(
            { runId: runState.runId, step: step.name, err },
            'ETL step failed',
          );

          const warning = this.etlWarningRepository.create({
            runId: runState.runId,
            stepName: step.name,
            severity: 'error',
            message,
          });
          await this.etlWarningRepository.save(warning);
        }
      }

      // Determine final status
      if (this.ETL_STEPS.length === 0) {
        runState.status = 'no_steps';
      } else if (runState.stepsFailed === 0) {
        runState.status = 'completed';
      } else if (runState.stepsSucceeded === 0) {
        runState.status = 'failed';
      } else {
        runState.status = 'partial';
      }

      runState.completedAt = new Date();
      const savedRun = await this.etlRunRepository.save(runState);

      this.logger.info(
        { runId: savedRun.runId, status: savedRun.status },
        'ETL run completed',
      );

      return savedRun;
    });
  }

  async runStep(stepName: string): Promise<EtlRun> {
    const step = this.ETL_STEPS.find((s) => s.name === stepName);
    if (!step) {
      throw new Error(`Unknown ETL step: ${stepName}`);
    }

    return this.advisoryLockService.withLock('catalog_etl', async () => {
      const runState = this.etlRunRepository.create({
        status: 'running',
        stepsTotal: 1,
        stepsSucceeded: 0,
        stepsFailed: 0,
      });
      await this.etlRunRepository.save(runState);

      try {
        await step.execute({ runId: runState.runId });
        runState.stepsSucceeded = 1;
        runState.status = 'completed';
      } catch (err: unknown) {
        runState.stepsFailed = 1;
        runState.status = 'failed';
        const message = err instanceof Error ? err.message : String(err);
        const warning = this.etlWarningRepository.create({
          runId: runState.runId,
          stepName: step.name,
          severity: 'error',
          message,
        });
        await this.etlWarningRepository.save(warning);
        runState.completedAt = new Date();
        await this.etlRunRepository.save(runState);
        throw err;
      }

      runState.completedAt = new Date();
      return this.etlRunRepository.save(runState);
    });
  }

  async getRuns(page: number, limit: number): Promise<[EtlRun[], number]> {
    return this.etlRunRepository.findAndCount({
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getRunWarnings(runId: string): Promise<EtlWarning[]> {
    return this.etlWarningRepository.find({
      where: { runId },
      order: { createdAt: 'ASC' },
    });
  }
}
