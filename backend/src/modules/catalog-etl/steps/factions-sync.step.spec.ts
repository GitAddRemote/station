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
    ids_star_systems: '',
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
      const upsertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction '),
      );
      expect(upsertCalls).toHaveLength(2);
      expect(upsertCalls[0][1][0]).toBe(1);
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
      // Only one station_faction upsert — the nameless faction is skipped
      const upsertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction '),
      );
      expect(upsertCalls).toHaveLength(1);
    });
  });

  describe('upsert idempotency', () => {
    it('calls station_faction upsert once per record', async () => {
      const factions = [makeFaction({ id: 1 }), makeFaction({ id: 1 })];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const upsertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction '),
      );
      expect(upsertCalls).toHaveLength(2);
    });
  });

  describe('friendly junction reconciliation', () => {
    it('deletes existing friendly rows then re-inserts current CSV set', async () => {
      const factions = [
        makeFaction({ id: 1, ids_factions_friendly: '2,3' }),
        makeFaction({ id: 2, name: 'Faction 2' }),
        makeFaction({ id: 3, name: 'Faction 3' }),
      ];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const deleteCalls = dsQuery.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as string).includes('DELETE FROM station_faction_friendly') &&
          (c[1] as number[])[0] === 1,
      );
      expect(deleteCalls).toHaveLength(1);

      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_friendly'),
      );
      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0][1]).toEqual([1, 2]);
      expect(insertCalls[1][1]).toEqual([1, 3]);
    });

    it('deletes existing rows even when CSV is empty (removes all stale links)', async () => {
      const factions = [makeFaction({ id: 1, ids_factions_friendly: null })];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const deleteCalls = dsQuery.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as string).includes('DELETE FROM station_faction_friendly') &&
          (c[1] as number[])[0] === 1,
      );
      expect(deleteCalls).toHaveLength(1);

      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_friendly'),
      );
      expect(insertCalls).toHaveLength(0);
    });

    it('saves a warning and skips insert when friendly faction id is not in the fetched set', async () => {
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
      // INSERT must be skipped — referenced faction row may not exist in station_faction
      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_friendly'),
      );
      expect(insertCalls).toHaveLength(0);
    });
  });

  describe('hostile junction reconciliation', () => {
    it('deletes existing hostile rows then re-inserts current CSV set', async () => {
      const factions = [
        makeFaction({ id: 1, ids_factions_hostile: '2,3' }),
        makeFaction({ id: 2, name: 'Faction 2' }),
        makeFaction({ id: 3, name: 'Faction 3' }),
      ];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const deleteCalls = dsQuery.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as string).includes('DELETE FROM station_faction_hostile') &&
          (c[1] as number[])[0] === 1,
      );
      expect(deleteCalls).toHaveLength(1);

      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_hostile'),
      );
      expect(insertCalls).toHaveLength(2);
    });

    it('deletes existing rows even when CSV is empty', async () => {
      const factions = [makeFaction({ id: 1, ids_factions_hostile: null })];
      uexGet.mockResolvedValue(factions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const deleteCalls = dsQuery.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as string).includes('DELETE FROM station_faction_hostile') &&
          (c[1] as number[])[0] === 1,
      );
      expect(deleteCalls).toHaveLength(1);

      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_hostile'),
      );
      expect(insertCalls).toHaveLength(0);
    });
  });
});
