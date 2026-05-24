import { StarSystemsSyncStep } from './star-systems-sync.step';
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

function makeSystem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Stanton',
    code: 'STA',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 1,
    wiki: null,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function makeFaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'United Empire',
    ids_star_systems: '',
    ...overrides,
  };
}

// dsQuery mock builder: controls what SELECT uex_id queries return
function buildDsQuery(
  knownFactions: number[],
  knownJurisdictions: number[],
  knownStarSystemsForJunction: number[] = [],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if ((sql as string).includes('FROM station_faction')) {
      return Promise.resolve(knownFactions.map((id) => ({ uex_id: id })));
    }
    if ((sql as string).includes('FROM station_jurisdiction')) {
      return Promise.resolve(knownJurisdictions.map((id) => ({ uex_id: id })));
    }
    if ((sql as string).includes('FROM station_star_system')) {
      return Promise.resolve(
        knownStarSystemsForJunction.map((id) => ({ uex_id: id })),
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
  return new StarSystemsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('StarSystemsSyncStep', () => {
  let uexGet: jest.Mock;
  let dsQuery: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    dsQuery = buildDsQuery([], []);
    repoCreate = jest
      .fn()
      .mockImplementation((dto) => ({ ...dto }) as EtlWarning);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('upsertStarSystems', () => {
    it('upserts each star system record', async () => {
      uexGet
        .mockResolvedValueOnce([
          makeSystem({ id: 1 }),
          makeSystem({ id: 2, name: 'Pyro' }),
        ])
        .mockResolvedValueOnce([]); // /factions for junction reconciliation

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(uexGet).toHaveBeenCalledWith('/star_systems');
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      );
      expect(upserts).toHaveLength(2);
      expect(upserts[0][1][0]).toBe(1);
      expect(upserts[1][1][0]).toBe(2);
    });

    it('maps all scalar fields correctly on upsert', async () => {
      dsQuery = buildDsQuery([3], [7]);
      uexGet
        .mockResolvedValueOnce([
          makeSystem({
            id: 5,
            id_faction: 3,
            id_jurisdiction: 7,
            name: 'Nyx',
            code: 'NYX',
            is_available: 0,
            is_available_live: 0,
            is_visible: 0,
            is_default: 0,
            wiki: 'https://wiki.example.com/nyx',
            date_added: 1600000000,
            date_modified: 1600000100,
          }),
        ])
        .mockResolvedValueOnce([]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      )!;
      const params = upsertCall[1] as unknown[];
      expect(params[0]).toBe(5); // uex_id
      expect(params[1]).toBe(3); // faction_uex_id
      expect(params[2]).toBe(7); // jurisdiction_uex_id
      expect(params[3]).toBe('Nyx'); // name
      expect(params[4]).toBe('NYX'); // code
      expect(params[5]).toBe(false); // is_available
      expect(params[9]).toBe('https://wiki.example.com/nyx'); // wiki
      expect(params[10]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
    });

    it('skips and warns on missing name', async () => {
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 10, name: '' })])
        .mockResolvedValueOnce([]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: 'Star system missing name',
          rawPayload: { id: 10 },
        }),
      );
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      );
      expect(upserts).toHaveLength(0);
    });

    it('is idempotent — calls upsert once per record regardless of duplicates', async () => {
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 1 }), makeSystem({ id: 1 })])
        .mockResolvedValueOnce([]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      );
      expect(upserts).toHaveLength(2); // DB ON CONFLICT handles actual dedup
    });

    it('treats null optional FK fields as null in the upsert params', async () => {
      uexGet
        .mockResolvedValueOnce([
          makeSystem({ id_faction: null, id_jurisdiction: null }),
        ])
        .mockResolvedValueOnce([]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      )!;
      const params = upsertCall[1] as unknown[];
      expect(params[1]).toBeNull(); // faction_uex_id
      expect(params[2]).toBeNull(); // jurisdiction_uex_id
    });

    it('nulls out faction_uex_id and warns when faction is unknown', async () => {
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 20, id_faction: 99 })])
        .mockResolvedValueOnce([]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave); // knownFactions=[]
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('99'),
          rawPayload: expect.objectContaining({ missing_faction_id: 99 }),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      )!;
      expect(upsertCall[1][1]).toBeNull(); // faction_uex_id nulled out
    });

    it('still upserts the record when faction is unknown (no skip)', async () => {
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 21, id_faction: 99 })])
        .mockResolvedValueOnce([]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      );
      expect(upserts).toHaveLength(1);
    });

    it('nulls out jurisdiction_uex_id and warns when jurisdiction is unknown', async () => {
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 22, id_jurisdiction: 88 })])
        .mockResolvedValueOnce([]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave); // knownJurisdictions=[]
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('88'),
          rawPayload: expect.objectContaining({ missing_jurisdiction_id: 88 }),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_star_system'),
      )!;
      expect(upsertCall[1][2]).toBeNull(); // jurisdiction_uex_id nulled out
    });
  });

  describe('reconcileStarSystemJunctions', () => {
    it('deletes existing junction rows then inserts links for known star systems', async () => {
      dsQuery = buildDsQuery([], [], [10]); // star system 10 exists
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 10 })]) // /star_systems
        .mockResolvedValueOnce([
          makeFaction({ id: 1, ids_star_systems: '10,20' }),
        ]); // /factions

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(uexGet).toHaveBeenCalledWith('/factions');

      const deleteCalls = dsQuery.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as string).includes(
            'DELETE FROM station_faction_star_system',
          ) && (c[1] as number[])[0] === 1,
      );
      expect(deleteCalls).toHaveLength(1);

      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_star_system'),
      );
      expect(insertCalls).toHaveLength(1);
      expect(insertCalls[0][1]).toEqual([1, 10]);
    });

    it('warns and skips junction insert when star system is not in DB', async () => {
      dsQuery = buildDsQuery([], [], [10]); // only 10 known; 20 is missing
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 10 })])
        .mockResolvedValueOnce([
          makeFaction({ id: 1, ids_star_systems: '10,20' }),
        ]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('20'),
          rawPayload: { faction_id: 1, missing_id: 20 },
        }),
      );
      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_star_system'),
      );
      expect(insertCalls).toHaveLength(1); // only id 10 inserted
    });

    it('deletes existing rows even when ids_star_systems is empty', async () => {
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 1 })])
        .mockResolvedValueOnce([makeFaction({ id: 1, ids_star_systems: '' })]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const deleteCalls = dsQuery.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as string).includes(
            'DELETE FROM station_faction_star_system',
          ) && (c[1] as number[])[0] === 1,
      );
      expect(deleteCalls).toHaveLength(1);

      const insertCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_faction_star_system'),
      );
      expect(insertCalls).toHaveLength(0);
    });

    it('skips nameless factions during junction reconciliation', async () => {
      uexGet
        .mockResolvedValueOnce([makeSystem({ id: 10 })])
        .mockResolvedValueOnce([makeFaction({ id: 99, name: '' })]);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const deleteCalls = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('DELETE FROM station_faction_star_system'),
      );
      expect(deleteCalls).toHaveLength(0);
    });
  });
});
