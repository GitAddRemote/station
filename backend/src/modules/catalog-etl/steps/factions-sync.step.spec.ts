import { FactionsSyncStep } from './factions-sync.step';
import { EtlWarning } from '../entities/etl-warning.entity';

const RUN_ID = 'test-run-id';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeFaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'United Empire',
    wiki: 'https://wiki.example.com/ue',
    ids_star_systems: '1,2',
    ids_factions_friendly: null,
    ids_factions_hostile: null,
    is_piracy: 0,
    is_bounty_hunting: 0,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  const uexApiClient = { get: uexGet } as never;
  const dataSource = { query: dsQuery } as never;
  const warningsRepo = { create: repoCreate, save: repoSave } as never;
  const logger = makeLogger() as never;
  return new FactionsSyncStep(uexApiClient, dataSource, warningsRepo, logger);
}

describe('FactionsSyncStep', () => {
  let uexGet: jest.Mock;
  let dsQuery: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    dsQuery = jest.fn().mockResolvedValue([]);
    repoCreate = jest
      .fn()
      .mockImplementation((dto) => ({ ...dto }) as EtlWarning);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('success path', () => {
    it('fetches factions and calls DataSource.query for each upsert', async () => {
      const factions = [
        makeFaction({ id: 1 }),
        makeFaction({ id: 2, name: 'Xenothreat' }),
      ];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(uexGet).toHaveBeenCalledWith('/factions');
      // 2 faction upserts (no junction rows since no friendly/hostile)
      expect(dsQuery).toHaveBeenCalledTimes(2);
      expect(dsQuery.mock.calls[0][0]).toContain('INSERT INTO station_faction');
      expect(dsQuery.mock.calls[0][1][0]).toBe(1);
    });
  });

  describe('missing name', () => {
    it('saves a warn warning and skips upsert for nameless faction', async () => {
      const factions = [
        makeFaction({ id: 10, name: '' }),
        makeFaction({ id: 11, name: 'Good Faction' }),
      ];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: RUN_ID,
          stepName: 'factions-sync',
          severity: 'warn',
          message: 'Faction missing name',
          rawPayload: { id: 10 },
        }),
      );
      expect(repoSave).toHaveBeenCalledTimes(1);
      // Only one upsert — the nameless faction is skipped
      expect(dsQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsert idempotency', () => {
    it('calls DataSource.query once per record (upsert on conflict)', async () => {
      const factions = [makeFaction({ id: 1 }), makeFaction({ id: 1 })];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      // 2 calls — one per record; the DB handles conflict resolution
      expect(dsQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('friendly/hostile junction population', () => {
    it('upserts junction rows for each friendly faction id in CSV', async () => {
      const factions = [
        makeFaction({ id: 1, ids_factions_friendly: '2,3' }),
        makeFaction({ id: 2, name: 'Faction 2' }),
        makeFaction({ id: 3, name: 'Faction 3' }),
      ];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      // 3 faction upserts + 2 friendly junction inserts
      const junctionCalls = dsQuery.mock.calls.filter((call: string[]) =>
        (call[0] as string).includes('station_faction_friendly'),
      );
      expect(junctionCalls).toHaveLength(2);
      expect(junctionCalls[0][1]).toEqual([1, 2]);
      expect(junctionCalls[1][1]).toEqual([1, 3]);
    });

    it('saves a warning when a friendly faction id is not in the fetched set', async () => {
      const factions = [makeFaction({ id: 1, ids_factions_friendly: '99' })];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('99'),
        }),
      );
      expect(repoSave).toHaveBeenCalledTimes(1);
      // Junction insert still happens even if id is missing from fetched set
      const junctionCalls = dsQuery.mock.calls.filter((call: string[]) =>
        (call[0] as string).includes('station_faction_friendly'),
      );
      expect(junctionCalls).toHaveLength(1);
    });

    it('upserts junction rows for each hostile faction id in CSV', async () => {
      const factions = [
        makeFaction({ id: 1, ids_factions_hostile: '2,3' }),
        makeFaction({ id: 2, name: 'Faction 2' }),
        makeFaction({ id: 3, name: 'Faction 3' }),
      ];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const junctionCalls = dsQuery.mock.calls.filter((call: string[]) =>
        (call[0] as string).includes('station_faction_hostile'),
      );
      expect(junctionCalls).toHaveLength(2);
    });
  });
});
