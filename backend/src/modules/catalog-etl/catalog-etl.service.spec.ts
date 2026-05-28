import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getLoggerToken } from 'nestjs-pino';
import { CatalogEtlService } from './catalog-etl.service';
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
import { VehiclesSyncStep } from './steps/vehicles-sync.step';
import { CommoditiesSyncStep } from './steps/commodities-sync.step';

function buildMockRun(overrides: Partial<EtlRun> = {}): EtlRun {
  const run = new EtlRun();
  run.runId = 'test-run-uuid';
  run.status = 'running';
  run.stepsTotal = 0;
  run.stepsSucceeded = 0;
  run.stepsFailed = 0;
  run.startedAt = new Date();
  run.createdAt = new Date();
  Object.assign(run, overrides);
  return run;
}

describe('CatalogEtlService', () => {
  let service: CatalogEtlService;
  let mockEtlRunRepository: Record<string, jest.Mock>;
  let mockEtlWarningRepository: Record<string, jest.Mock>;
  let mockAdvisoryLockService: { withLock: jest.Mock };

  beforeEach(async () => {
    mockEtlRunRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    mockEtlWarningRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockAdvisoryLockService = {
      withLock: jest
        .fn()
        .mockImplementation((_key: string, fn: () => Promise<unknown>) => fn()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogEtlService,
        {
          provide: getLoggerToken(CatalogEtlService.name),
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EtlRun),
          useValue: mockEtlRunRepository,
        },
        {
          provide: getRepositoryToken(EtlWarning),
          useValue: mockEtlWarningRepository,
        },
        {
          provide: AdvisoryLockService,
          useValue: mockAdvisoryLockService,
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn().mockResolvedValue([{ last_completed: null }]),
          },
        },
        {
          provide: FactionsSyncStep,
          useValue: { name: 'factions', execute: jest.fn() },
        },
        {
          provide: JurisdictionsSyncStep,
          useValue: { name: 'jurisdictions', execute: jest.fn() },
        },
        {
          provide: CompaniesSyncStep,
          useValue: { name: 'companies', execute: jest.fn() },
        },
        {
          provide: StarSystemsSyncStep,
          useValue: { name: 'star-systems', execute: jest.fn() },
        },
        {
          provide: OrbitsSyncStep,
          useValue: { name: 'orbits', execute: jest.fn() },
        },
        {
          provide: PlanetsSyncStep,
          useValue: { name: 'planets', execute: jest.fn() },
        },
        {
          provide: MoonsSyncStep,
          useValue: { name: 'moons', execute: jest.fn() },
        },
        {
          provide: CitiesSyncStep,
          useValue: { name: 'cities', execute: jest.fn() },
        },
        {
          provide: SpaceStationsSyncStep,
          useValue: { name: 'space-stations', execute: jest.fn() },
        },
        {
          provide: OutpostsSyncStep,
          useValue: { name: 'outposts', execute: jest.fn() },
        },
        {
          provide: PoisSyncStep,
          useValue: { name: 'pois', execute: jest.fn() },
        },
        {
          provide: JumpPointsSyncStep,
          useValue: { name: 'jump-points', execute: jest.fn() },
        },
        {
          provide: CategoriesSyncStep,
          useValue: { name: 'categories-sync', execute: jest.fn() },
        },
        {
          provide: TerminalsSyncStep,
          useValue: { name: 'terminals-sync', execute: jest.fn() },
        },
        {
          provide: TerminalDistancesSyncStep,
          useValue: { name: 'terminal-distances-sync', execute: jest.fn() },
        },
        {
          provide: VehiclesSyncStep,
          useValue: { name: 'vehicles-sync', execute: jest.fn() },
        },
        {
          provide: CommoditiesSyncStep,
          useValue: { name: 'commodities-sync', execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CatalogEtlService>(CatalogEtlService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.assign(service, { ETL_STEPS: [] });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runEtl', () => {
    it('runs all steps successfully → status completed', async () => {
      const step1: EtlStep = {
        name: 'step-one',
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const step2: EtlStep = {
        name: 'step-two',
        execute: jest.fn().mockResolvedValue(undefined),
      };

      Object.assign(service, { ETL_STEPS: [step1, step2] });

      const initialRun = buildMockRun({ stepsTotal: 2 });
      mockEtlRunRepository.create.mockReturnValue(initialRun);
      mockEtlRunRepository.save
        .mockResolvedValueOnce(initialRun) // first save (create)
        .mockImplementation((run: EtlRun) =>
          Promise.resolve({ ...run, completedAt: new Date() }),
        ); // final save

      mockEtlWarningRepository.create.mockReturnValue(new EtlWarning());
      mockEtlWarningRepository.save.mockResolvedValue(new EtlWarning());

      const result = await service.runEtl();

      expect(mockAdvisoryLockService.withLock).toHaveBeenCalledWith(
        'catalog_etl',
        expect.any(Function),
      );
      expect(result.status).toBe('completed');
      expect(result.stepsSucceeded).toBe(2);
      expect(result.stepsFailed).toBe(0);
      expect(step1.execute).toHaveBeenCalledWith({ runId: initialRun.runId });
      expect(step2.execute).toHaveBeenCalledWith({ runId: initialRun.runId });
    });

    it('one step fails → status partial, warning saved', async () => {
      const passingStep: EtlStep = {
        name: 'passing-step',
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const failingStep: EtlStep = {
        name: 'failing-step',
        execute: jest.fn().mockRejectedValue(new Error('Step exploded')),
      };

      Object.assign(service, { ETL_STEPS: [passingStep, failingStep] });

      const initialRun = buildMockRun({ stepsTotal: 2 });
      mockEtlRunRepository.create.mockReturnValue(initialRun);
      mockEtlRunRepository.save
        .mockResolvedValueOnce(initialRun)
        .mockImplementation((run: EtlRun) =>
          Promise.resolve({ ...run, completedAt: new Date() }),
        );

      const mockWarning = new EtlWarning();
      mockEtlWarningRepository.create.mockReturnValue(mockWarning);
      mockEtlWarningRepository.save.mockResolvedValue(mockWarning);

      const result = await service.runEtl();

      expect(result.status).toBe('partial');
      expect(result.stepsFailed).toBe(1);
      expect(mockEtlWarningRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEtlWarningRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          stepName: 'failing-step',
          message: 'Step exploded',
        }),
      );
    });

    it('all steps fail → status failed', async () => {
      const failingStep1: EtlStep = {
        name: 'fail-1',
        execute: jest.fn().mockRejectedValue(new Error('Failure 1')),
      };
      const failingStep2: EtlStep = {
        name: 'fail-2',
        execute: jest.fn().mockRejectedValue(new Error('Failure 2')),
      };

      Object.assign(service, { ETL_STEPS: [failingStep1, failingStep2] });

      const initialRun = buildMockRun({ stepsTotal: 2 });
      mockEtlRunRepository.create.mockReturnValue(initialRun);
      mockEtlRunRepository.save
        .mockResolvedValueOnce(initialRun)
        .mockImplementation((run: EtlRun) =>
          Promise.resolve({ ...run, completedAt: new Date() }),
        );

      const mockWarning = new EtlWarning();
      mockEtlWarningRepository.create.mockReturnValue(mockWarning);
      mockEtlWarningRepository.save.mockResolvedValue(mockWarning);

      const result = await service.runEtl();

      expect(result.status).toBe('failed');
      expect(result.stepsSucceeded).toBe(0);
      expect(result.stepsFailed).toBe(2);
    });

    it('no steps registered → status no_steps', async () => {
      Object.assign(service, { ETL_STEPS: [] });
      const initialRun = buildMockRun({ stepsTotal: 0 });
      mockEtlRunRepository.create.mockReturnValue(initialRun);
      mockEtlRunRepository.save
        .mockResolvedValueOnce(initialRun)
        .mockImplementation((run: EtlRun) =>
          Promise.resolve({ ...run, completedAt: new Date() }),
        );

      const result = await service.runEtl();

      expect(result.status).toBe('no_steps');
      expect(result.stepsSucceeded).toBe(0);
      expect(result.stepsFailed).toBe(0);
      expect(mockEtlWarningRepository.save).not.toHaveBeenCalled();
    });

    it('concurrent lock rejection → throws 409 ConflictException', async () => {
      mockAdvisoryLockService.withLock.mockRejectedValueOnce(
        new ConflictException("Lock 'catalog_etl' already held"),
      );

      const runPromise = service.runEtl();

      await expect(runPromise).rejects.toThrow(ConflictException);

      // Repository should never be touched when lock not acquired
      expect(mockEtlRunRepository.create).not.toHaveBeenCalled();
      expect(mockEtlRunRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getRuns', () => {
    it('returns paginated runs ordered by startedAt DESC', async () => {
      const runs: EtlRun[] = [buildMockRun()];
      mockEtlRunRepository.findAndCount.mockResolvedValue([runs, 1]);

      const [data, total] = await service.getRuns(1, 20);

      expect(data).toEqual(runs);
      expect(total).toBe(1);
      expect(mockEtlRunRepository.findAndCount).toHaveBeenCalledWith({
        order: { startedAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getRunWarnings', () => {
    it('returns warnings for a run ordered by createdAt ASC', async () => {
      const warnings: EtlWarning[] = [];
      mockEtlWarningRepository.find.mockResolvedValue(warnings);

      const result = await service.getRunWarnings('some-uuid');

      expect(result).toEqual(warnings);
      expect(mockEtlWarningRepository.find).toHaveBeenCalledWith({
        where: { runId: 'some-uuid' },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('runStep', () => {
    it('acquires advisory lock, creates EtlRun, executes step, marks completed', async () => {
      const step: EtlStep = {
        name: 'terminals-sync',
        execute: jest.fn().mockResolvedValue(undefined),
      };
      Object.assign(service, { ETL_STEPS: [step] });

      const initialRun = buildMockRun({ stepsTotal: 1 });
      mockEtlRunRepository.create.mockReturnValue(initialRun);
      mockEtlRunRepository.save
        .mockResolvedValueOnce(initialRun)
        .mockImplementation((run: EtlRun) =>
          Promise.resolve({ ...run, completedAt: new Date() }),
        );

      const result = await service.runStep('terminals-sync');

      expect(mockAdvisoryLockService.withLock).toHaveBeenCalledWith(
        'catalog_etl',
        expect.any(Function),
      );
      expect(mockEtlRunRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          stepName: 'terminals-sync',
          stepsTotal: 1,
        }),
      );
      expect(step.execute).toHaveBeenCalledWith({ runId: initialRun.runId });
      expect(result.status).toBe('completed');
      expect(result.stepsSucceeded).toBe(1);
      expect(result.stepsFailed).toBe(0);
      expect(mockEtlWarningRepository.save).not.toHaveBeenCalled();
    });

    it('persists error warning and rethrows when step throws', async () => {
      const step: EtlStep = {
        name: 'terminals-sync',
        execute: jest.fn().mockRejectedValue(new Error('step boom')),
      };
      Object.assign(service, { ETL_STEPS: [step] });

      const initialRun = buildMockRun({ stepsTotal: 1 });
      mockEtlRunRepository.create.mockReturnValue(initialRun);
      mockEtlRunRepository.save
        .mockResolvedValueOnce(initialRun)
        .mockImplementation((run: EtlRun) =>
          Promise.resolve({ ...run, completedAt: new Date() }),
        );
      const mockWarning = new EtlWarning();
      mockEtlWarningRepository.create.mockReturnValue(mockWarning);
      mockEtlWarningRepository.save.mockResolvedValue(mockWarning);

      await expect(service.runStep('terminals-sync')).rejects.toThrow(
        'step boom',
      );

      expect(mockEtlWarningRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEtlWarningRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', message: 'step boom' }),
      );
    });

    it('throws when step name is not registered without touching repositories', async () => {
      Object.assign(service, { ETL_STEPS: [] });

      await expect(service.runStep('unknown-step')).rejects.toThrow(
        'Unknown ETL step: unknown-step',
      );
      expect(mockEtlRunRepository.create).not.toHaveBeenCalled();
    });

    it('rejects with ConflictException when advisory lock is already held', async () => {
      const step: EtlStep = {
        name: 'terminals-sync',
        execute: jest.fn(),
      };
      Object.assign(service, { ETL_STEPS: [step] });
      mockAdvisoryLockService.withLock.mockRejectedValueOnce(
        new ConflictException("Lock 'catalog_etl' already held"),
      );

      await expect(service.runStep('terminals-sync')).rejects.toThrow(
        ConflictException,
      );
      expect(mockEtlRunRepository.create).not.toHaveBeenCalled();
    });
  });
});
