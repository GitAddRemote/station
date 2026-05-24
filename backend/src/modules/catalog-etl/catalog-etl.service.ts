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
  ) {
    this.ETL_STEPS = [
      factionsSyncStep,
      jurisdictionsSyncStep,
      starSystemsSyncStep,
      companiesSyncStep,
      orbitsSyncStep,
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
