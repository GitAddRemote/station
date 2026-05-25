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
  terminals: Record<string, number> = { PORTOL: 100, LORV: 200 },
  lastRunDate: Date | null = null,
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM station_etl_run')) {
      return Promise.resolve([{ last_completed: lastRunDate ?? null }]);
    }
    if (
      sql.includes('FROM station_terminal') &&
      !sql.includes('station_terminal_distance')
    ) {
      return Promise.resolve(
        Object.entries(terminals).map(([code, id]) => ({ code, id })),
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
      const dsQuery = buildDsQuery({ PORTOL: 100, LORV: 200 }, recentDate);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      expect(uexGet).not.toHaveBeenCalled();
    });

    it('runs when no prior completed run exists', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([]);

      await step.execute(CTX);

      expect(uexGet).toHaveBeenCalledWith('/terminals_distances');
    });

    it('runs when last completed run was more than 12 hours ago', async () => {
      const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000);
      const dsQuery = buildDsQuery({ PORTOL: 100, LORV: 200 }, oldDate);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'LORV',
          distance: 1500.5,
        },
      ]);

      await step.execute(CTX);

      expect(uexGet).toHaveBeenCalledWith('/terminals_distances');
    });
  });

  describe('upsert', () => {
    it('upserts distance with resolved terminal FKs', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'LORV',
          distance: 1500.5,
        },
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
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'LORV',
          distance: 100,
        },
      ]);

      await step.execute(CTX);

      const stateInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('station_etl_run_state'),
      );
      expect(stateInsert).toBeUndefined();
    });

    it('batches multiple distances into a single INSERT', async () => {
      const dsQuery = buildDsQuery({ PORTOL: 100, LORV: 200, ARIA: 300 });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'LORV',
          distance: 100,
        },
        {
          terminal_code_origin: 'LORV',
          terminal_code_destination: 'ARIA',
          distance: 200,
        },
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'ARIA',
          distance: 300,
        },
      ]);

      await step.execute(CTX);

      const upsertCalls = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      // All 3 valid rows fit in one batch (batch size 500)
      expect(upsertCalls).toHaveLength(1);
      expect(upsertCalls[0][1]).toEqual([
        100, 200, 100, 200, 300, 200, 100, 300, 300,
      ]);
    });

    it('writes NOW() in INSERT and does not issue full-table synced_at UPDATE', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'LORV',
          distance: 100,
        },
      ]);

      await step.execute(CTX);

      // Each batch INSERT should write synced_at=NOW() directly
      const insertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toContain('NOW()');

      // No full-table UPDATE should be issued (skip guard uses station_etl_run)
      const fullTableUpdate = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_terminal_distance') &&
          !sql.includes('INSERT'),
      );
      expect(fullTableUpdate).toBeUndefined();
    });
  });

  describe('warnings', () => {
    it('warns and skips when origin terminal code is unknown', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        {
          terminal_code_origin: 'UNKNOWN',
          terminal_code_destination: 'LORV',
          distance: 500,
        },
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining(
            "unknown origin terminal code 'UNKNOWN'",
          ),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCall).toBeUndefined();
    });

    it('warns and skips when destination terminal code is unknown', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'UNKNOWN',
          distance: 500,
        },
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining(
            "unknown destination terminal code 'UNKNOWN'",
          ),
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
        {
          terminal_code_origin: 'UNKNOWN',
          terminal_code_destination: 'LORV',
          distance: 500,
        },
        {
          terminal_code_origin: 'PORTOL',
          terminal_code_destination: 'LORV',
          distance: 1000,
        },
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
