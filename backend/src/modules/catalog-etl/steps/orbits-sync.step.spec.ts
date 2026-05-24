import { OrbitsSyncStep } from './orbits-sync.step';
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

function makeOrbit(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system: 10,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Stanton I',
    name_origin: null,
    code: 'STA-1',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 0,
    is_lagrange: 0,
    is_man_made: 0,
    is_asteroid: 0,
    is_planet: 1,
    is_star: 0,
    is_jump_point: 0,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function makeDistance(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    id_star_system_origin: 10,
    id_star_system_destination: 10,
    id_orbit_origin: 1,
    id_orbit_destination: 2,
    distance_gm: 12.5,
    game_version: '3.23',
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

// dsQuery mock builder: controls what SELECT uex_id queries return
function buildDsQuery(
  knownStarSystems: number[],
  knownOrbits: number[],
  knownFactions: number[] = [],
  knownJurisdictions: number[] = [],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if ((sql as string).includes('FROM station_star_system')) {
      return Promise.resolve(knownStarSystems.map((id) => ({ uex_id: id })));
    }
    if ((sql as string).includes('FROM station_faction')) {
      return Promise.resolve(knownFactions.map((id) => ({ uex_id: id })));
    }
    if ((sql as string).includes('FROM station_jurisdiction')) {
      return Promise.resolve(knownJurisdictions.map((id) => ({ uex_id: id })));
    }
    if (
      (sql as string).includes('FROM station_orbit') &&
      !sql.includes('INSERT')
    ) {
      return Promise.resolve(knownOrbits.map((id) => ({ uex_id: id })));
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
  return new OrbitsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('OrbitsSyncStep', () => {
  let uexGet: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    repoCreate = jest
      .fn()
      .mockImplementation((dto) => ({ ...dto }) as EtlWarning);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('syncOrbits', () => {
    it('upserts each orbit with a known star system', async () => {
      uexGet
        .mockResolvedValueOnce([makeOrbit({ id: 1, id_star_system: 10 })])
        .mockResolvedValueOnce([]); // orbit_distances

      const dsQuery = buildDsQuery([10], [1]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(uexGet).toHaveBeenCalledWith('/orbits');
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      );
      expect(upserts).toHaveLength(1);
      const params = upserts[0][1] as unknown[];
      expect(params[0]).toBe(1); // uex_id
      expect(params[1]).toBe(10); // star_system_uex_id
    });

    it('maps all boolean flags correctly', async () => {
      uexGet
        .mockResolvedValueOnce([
          makeOrbit({
            id: 2,
            id_star_system: 10,
            is_lagrange: 1,
            is_jump_point: 1,
            is_planet: 0,
          }),
        ])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([10], [2]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const params = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      )![1] as unknown[];
      expect(params[11]).toBe(true); // is_lagrange
      expect(params[14]).toBe(false); // is_planet
      expect(params[16]).toBe(true); // is_jump_point
    });

    it('skips and warns when orbit has no name', async () => {
      uexGet
        .mockResolvedValueOnce([makeOrbit({ id: 3, name: '' })])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([10], []);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: 'Orbit missing name',
          rawPayload: { id: 3 },
        }),
      );
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      );
      expect(upserts).toHaveLength(0);
    });

    it('skips and warns when orbit references unknown star system', async () => {
      uexGet
        .mockResolvedValueOnce([makeOrbit({ id: 4, id_star_system: 999 })])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([10], []); // 999 not in known set
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('999'),
          rawPayload: expect.objectContaining({
            orbit_id: 4,
            id_star_system: 999,
          }),
        }),
      );
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      );
      expect(upserts).toHaveLength(0);
    });

    it('skips and warns when id_star_system is null', async () => {
      uexGet
        .mockResolvedValueOnce([makeOrbit({ id: 5, id_star_system: null })])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([10], []);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      );
      expect(upserts).toHaveLength(0);
    });

    it('emits top-level warning when station_star_system is empty', async () => {
      uexGet
        .mockResolvedValueOnce([makeOrbit({ id: 6, id_star_system: 10 })])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([], []); // no known star systems
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('station_star_system is empty'),
        }),
      );
    });

    it('nulls out faction_uex_id and warns when orbit faction is unknown', async () => {
      uexGet
        .mockResolvedValueOnce([
          makeOrbit({ id: 7, id_star_system: 10, id_faction: 99 }),
        ])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([10], [7]); // knownFactions=[]
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('99'),
          rawPayload: expect.objectContaining({ missing_faction_id: 99 }),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      )!;
      expect(upsertCall[1][2]).toBeNull(); // faction_uex_id nulled out
    });

    it('still upserts the orbit record when faction is unknown (no skip)', async () => {
      uexGet
        .mockResolvedValueOnce([
          makeOrbit({ id: 8, id_star_system: 10, id_faction: 99 }),
        ])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([10], [8]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      );
      expect(upserts).toHaveLength(1);
    });

    it('nulls out jurisdiction_uex_id and warns when orbit jurisdiction is unknown', async () => {
      uexGet
        .mockResolvedValueOnce([
          makeOrbit({ id: 9, id_star_system: 10, id_jurisdiction: 88 }),
        ])
        .mockResolvedValueOnce([]);

      const dsQuery = buildDsQuery([10], [9]); // knownJurisdictions=[]
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('88'),
          rawPayload: expect.objectContaining({ missing_jurisdiction_id: 88 }),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit'),
      )!;
      expect(upsertCall[1][3]).toBeNull(); // jurisdiction_uex_id nulled out
    });
  });

  describe('syncOrbitDistances', () => {
    it('upserts a distance record when both orbit FKs are known', async () => {
      uexGet
        .mockResolvedValueOnce([]) // orbits
        .mockResolvedValueOnce([
          makeDistance({
            id: 100,
            id_orbit_origin: 1,
            id_orbit_destination: 2,
          }),
        ]);

      const dsQuery = buildDsQuery([], [1, 2]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(uexGet).toHaveBeenCalledWith('/orbit_distances');
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit_distance'),
      );
      expect(upserts).toHaveLength(1);
      const params = upserts[0][1] as unknown[];
      expect(params[0]).toBe(100); // uex_id
      expect(params[3]).toBe(1); // orbit_origin_uex_id
      expect(params[4]).toBe(2); // orbit_dest_uex_id
      expect(params[5]).toBe(12.5); // distance_gm
    });

    it('skips and warns when origin orbit is unknown', async () => {
      uexGet
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          makeDistance({ id_orbit_origin: 99, id_orbit_destination: 2 }),
        ]);

      const dsQuery = buildDsQuery([], [2]); // 99 unknown
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('99'),
        }),
      );
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit_distance'),
      );
      expect(upserts).toHaveLength(0);
    });

    it('skips and warns when destination orbit is unknown', async () => {
      uexGet
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          makeDistance({ id_orbit_origin: 1, id_orbit_destination: 99 }),
        ]);

      const dsQuery = buildDsQuery([], [1]); // 99 unknown
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit_distance'),
      );
      expect(upserts).toHaveLength(0);
    });

    it('maps star_system origin/dest and game_version into upsert params', async () => {
      uexGet.mockResolvedValueOnce([]).mockResolvedValueOnce([
        makeDistance({
          id_star_system_origin: 10,
          id_star_system_destination: 20,
          game_version: '4.0',
        }),
      ]);

      const dsQuery = buildDsQuery([10, 20], [1, 2]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const params = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit_distance'),
      )![1] as unknown[];
      expect(params[1]).toBe(10); // star_system_origin_uex_id
      expect(params[2]).toBe(20); // star_system_dest_uex_id
      expect(params[6]).toBe('4.0'); // game_version
    });

    it('nulls out star_system_origin_uex_id and warns when origin star system is unknown', async () => {
      uexGet.mockResolvedValueOnce([]).mockResolvedValueOnce([
        makeDistance({
          id_star_system_origin: 999,
          id_star_system_destination: 20,
        }),
      ]);

      const dsQuery = buildDsQuery([20], [1, 2]); // 999 unknown
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('999'),
          rawPayload: expect.objectContaining({
            missing_star_system_origin_id: 999,
          }),
        }),
      );
      const params = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit_distance'),
      )![1] as unknown[];
      expect(params[1]).toBeNull(); // star_system_origin_uex_id nulled out
      expect(params[2]).toBe(20); // destination unchanged
    });

    it('nulls out star_system_dest_uex_id and warns when destination star system is unknown', async () => {
      uexGet.mockResolvedValueOnce([]).mockResolvedValueOnce([
        makeDistance({
          id_star_system_origin: 10,
          id_star_system_destination: 888,
        }),
      ]);

      const dsQuery = buildDsQuery([10], [1, 2]); // 888 unknown
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('888'),
          rawPayload: expect.objectContaining({
            missing_star_system_dest_id: 888,
          }),
        }),
      );
      const params = dsQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit_distance'),
      )![1] as unknown[];
      expect(params[1]).toBe(10); // origin unchanged
      expect(params[2]).toBeNull(); // star_system_dest_uex_id nulled out
    });

    it('still upserts the distance record when a star system FK is unknown (no skip)', async () => {
      uexGet.mockResolvedValueOnce([]).mockResolvedValueOnce([
        makeDistance({
          id_star_system_origin: 999,
          id_star_system_destination: 888,
        }),
      ]);

      const dsQuery = buildDsQuery([], [1, 2]); // both star systems unknown
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_orbit_distance'),
      );
      expect(upserts).toHaveLength(1);
    });
  });
});
