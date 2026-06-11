import { TerminalDistancesSyncStep } from './terminal-distances-sync.step';
import { UEXClientException } from '../../uex-sync/exceptions/uex-exceptions';

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
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (
      sql.includes('FROM station_terminal') &&
      !sql.includes('station_terminal_distance')
    ) {
      return Promise.resolve(
        Object.entries(terminals).map(([code, id]) => ({ code, id })),
      );
    }
    // DELETE ... RETURNING 1 — return an array whose length = deleted count
    if (sql.includes('DELETE FROM station_terminal_distance')) {
      return Promise.resolve([]);
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

    it('handles empty distances list without upserting or deleting', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCall).toBeUndefined();

      const deleteCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('DELETE FROM station_terminal_distance'),
      );
      expect(deleteCall).toBeUndefined();
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
      expect(upsertCalls).toHaveLength(1);
      expect(upsertCalls[0][1]).toEqual([
        100, 200, 100, 200, 300, 200, 100, 300, 300,
      ]);
    });
  });

  describe('stale-row deletion', () => {
    it('issues a DELETE for rows absent from current UEX payload', async () => {
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

      const deleteCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('DELETE FROM station_terminal_distance'),
      );
      expect(deleteCall).toBeDefined();
      // The DELETE uses a NOT EXISTS anti-join against the valid pair set
      expect(deleteCall![0]).toContain('NOT EXISTS');
      // Parameters include the valid pair (100, 200)
      expect(deleteCall![1]).toEqual([100, 200]);
    });

    it('does not DELETE when all records had unknown codes (safety guard)', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        {
          terminal_code_origin: 'UNKNOWN_A',
          terminal_code_destination: 'UNKNOWN_B',
          distance: 100,
        },
      ]);

      await step.execute(CTX);

      const deleteCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('DELETE FROM station_terminal_distance'),
      );
      expect(deleteCall).toBeUndefined();

      // Should emit a warning about skipping stale-delete to prevent data loss
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('stale-row deletion skipped'),
        }),
      );
    });
  });

  describe('UEX endpoint unavailable', () => {
    it('writes a visible ETL warning when bulk endpoint returns 4xx', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockRejectedValue(new UEXClientException('404 Not Found'));

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('bulk endpoint unavailable'),
        }),
      );

      // No upsert or delete should run
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCall).toBeUndefined();
    });

    it('rethrows non-4xx errors', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      const serverErr = new Error('network timeout');
      uexGet.mockRejectedValue(serverErr);

      await expect(step.execute(CTX)).rejects.toThrow('network timeout');
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

      // One warning for the unknown origin
      const warnCalls = (repoSave as jest.Mock).mock.calls.filter(
        ([arg]: [{ severity?: string }]) => arg.severity === 'warn',
      );
      expect(warnCalls).toHaveLength(1);

      const upsertCalls = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal_distance'),
      );
      expect(upsertCalls).toHaveLength(1);
    });
  });
});
