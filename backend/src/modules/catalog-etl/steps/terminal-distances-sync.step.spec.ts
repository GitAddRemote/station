import { TerminalDistancesSyncStep } from './terminal-distances-sync.step';

const CTX = { runId: 'test-run-id' };

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function buildDsQuery(
  terminals: Record<number, number> = { 1: 100, 2: 200 },
  lastRunDate: Date | null = null,
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (
      sql.includes('FROM station_terminal_distance') &&
      sql.includes('MAX(synced_at)')
    ) {
      return Promise.resolve([{ last_synced: lastRunDate ?? null }]);
    }
    if (sql.includes('station_terminal')) {
      return Promise.resolve(
        Object.entries(terminals).map(([uex_id, id]) => ({
          uex_id: Number(uex_id),
          id,
        })),
      );
    }
    return Promise.resolve([]);
  });
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new TerminalDistancesSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('TerminalDistancesSyncStep', () => {
  let uexGet: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('skip guard', () => {
    it('skips when last completed run was within 12 hours', async () => {
      const recentDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const dsQuery = buildDsQuery({ 1: 100, 2: 200 }, recentDate);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      expect(uexGet).not.toHaveBeenCalled();
    });

    it('runs when no prior completed run exists', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([]);

      await step.execute(CTX);

      expect(uexGet).toHaveBeenCalledWith('/terminal_distances');
    });

    it('runs when last completed run was more than 12 hours ago', async () => {
      const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000);
      const dsQuery = buildDsQuery({ 1: 100, 2: 200 }, oldDate);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        { id_terminal_origin: 1, id_terminal_destination: 2, distance: 1500.5 },
      ]);

      await step.execute(CTX);

      expect(uexGet).toHaveBeenCalledWith('/terminal_distances');
    });
  });

  describe('upsert', () => {
    it('upserts distance with resolved terminal FKs', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        { id_terminal_origin: 1, id_terminal_destination: 2, distance: 1500.5 },
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCall).toBeDefined();
      expect(upsertCall[1]).toEqual([100, 200, 1500.5]);
    });

    it('handles empty distances list without upserting', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCall).toBeUndefined();
    });

    it('does not write to station_etl_run_state (run tracking is handled by runStep)', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        { id_terminal_origin: 1, id_terminal_destination: 2, distance: 100 },
      ]);

      await step.execute(CTX);

      const stateInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('station_etl_run_state'),
      );
      expect(stateInsert).toBeUndefined();
    });

    it('processes multiple distances', async () => {
      const dsQuery = buildDsQuery({ 1: 100, 2: 200, 3: 300 });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        { id_terminal_origin: 1, id_terminal_destination: 2, distance: 100 },
        { id_terminal_origin: 2, id_terminal_destination: 3, distance: 200 },
        { id_terminal_origin: 1, id_terminal_destination: 3, distance: 300 },
      ]);

      await step.execute(CTX);

      const upsertCalls = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCalls).toHaveLength(3);
    });
  });

  describe('warnings', () => {
    it('warns and skips when origin terminal is unknown', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        { id_terminal_origin: 99, id_terminal_destination: 2, distance: 500 },
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown origin terminal 99'),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCall).toBeUndefined();
    });

    it('warns and skips when destination terminal is unknown', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        { id_terminal_origin: 1, id_terminal_destination: 99, distance: 500 },
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown destination terminal 99'),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCall).toBeUndefined();
    });

    it('processes valid records even when some are skipped', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        { id_terminal_origin: 99, id_terminal_destination: 2, distance: 500 },
        { id_terminal_origin: 1, id_terminal_destination: 2, distance: 1000 },
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledTimes(1);
      const upsertCalls = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCalls).toHaveLength(1);
    });
  });
});
