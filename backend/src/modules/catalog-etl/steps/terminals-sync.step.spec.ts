import { TerminalsSyncStep } from './terminals-sync.step';

const CTX = { runId: 'test-run-id' };

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeTerminal(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Port Olisar',
    code: 'PO',
    fullname: 'Port Olisar',
    nickname: null,
    displayname: null,
    id_space_station: 10,
    id_outpost: null,
    id_city: null,
    id_star_system: 1,
    id_planet: 2,
    id_orbit: 3,
    id_moon: null,
    id_poi: null,
    id_faction: 5,
    id_company: 6,
    contact_url: null,
    screenshot: null,
    max_container_size: null,
    type: 'commodity',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default_system: 0,
    is_affinity_influenceable: 0,
    is_habitation: 0,
    is_refinery: 0,
    is_cargo_center: 1,
    is_medical: 0,
    is_food: 0,
    is_shop_fps: 0,
    is_shop_vehicle: 0,
    is_refuel: 1,
    is_repair: 0,
    is_nqa: 0,
    is_jump_point: 0,
    is_player_owned: 0,
    is_auto_load: 0,
    has_loading_dock: 1,
    has_docking_port: 0,
    has_freight_elevator: 1,
    game_version: '3.23',
    date_added: 1700000000,
    date_modified: 1710000000,
    ...overrides,
  };
}

interface FkMaps {
  spaceStations?: Record<number, number>;
  outposts?: Record<number, number>;
  cities?: Record<number, number>;
  pois?: Record<number, number>;
  starSystems?: Record<number, number>;
  planets?: Record<number, number>;
  orbits?: Record<number, number>;
  moons?: Record<number, number>;
  factions?: Record<number, number>;
  companies?: Record<number, number>;
  lastRunDate?: Date | null;
}

function buildDsQuery(maps: FkMaps = {}): jest.Mock {
  const {
    spaceStations = { 10: 100 },
    outposts = {},
    cities = {},
    pois = {},
    starSystems = { 1: 1001 },
    planets = { 2: 1002 },
    orbits = { 3: 1003 },
    moons = {},
    factions = { 5: 1005 },
    companies = { 6: 1006 },
    lastRunDate = null,
  } = maps;

  return jest.fn().mockImplementation((sql: string) => {
    if (
      sql.includes('FROM station_terminal') &&
      sql.includes('MAX(synced_at)')
    ) {
      return Promise.resolve([{ last_synced: lastRunDate ?? null }]);
    }
    if (sql.includes('FROM station_space_station')) {
      return Promise.resolve(
        Object.entries(spaceStations).map(([k, v]) => ({
          uex_id: Number(k),
          id: v,
        })),
      );
    }
    if (sql.includes('FROM station_outpost')) {
      return Promise.resolve(
        Object.entries(outposts).map(([k, v]) => ({
          uex_id: Number(k),
          id: v,
        })),
      );
    }
    if (sql.includes('FROM station_city')) {
      return Promise.resolve(
        Object.entries(cities).map(([k, v]) => ({ uex_id: Number(k), id: v })),
      );
    }
    if (sql.includes('FROM station_poi')) {
      return Promise.resolve(
        Object.entries(pois).map(([k, v]) => ({ uex_id: Number(k), id: v })),
      );
    }
    if (sql.includes('FROM station_star_system')) {
      return Promise.resolve(
        Object.entries(starSystems).map(([k, v]) => ({
          uex_id: Number(k),
          id: v,
        })),
      );
    }
    if (sql.includes('FROM station_planet')) {
      return Promise.resolve(
        Object.entries(planets).map(([k, v]) => ({ uex_id: Number(k), id: v })),
      );
    }
    if (sql.includes('FROM station_orbit')) {
      return Promise.resolve(
        Object.entries(orbits).map(([k, v]) => ({ uex_id: Number(k), id: v })),
      );
    }
    if (sql.includes('FROM station_moon')) {
      return Promise.resolve(
        Object.entries(moons).map(([k, v]) => ({ uex_id: Number(k), id: v })),
      );
    }
    if (sql.includes('FROM station_faction')) {
      return Promise.resolve(
        Object.entries(factions).map(([k, v]) => ({
          uex_id: Number(k),
          id: v,
        })),
      );
    }
    if (sql.includes('FROM station_company')) {
      return Promise.resolve(
        Object.entries(companies).map(([k, v]) => ({
          uex_id: Number(k),
          id: v,
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
  return new TerminalsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('TerminalsSyncStep', () => {
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
      const dsQuery = buildDsQuery({ lastRunDate: recentDate });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      expect(uexGet).not.toHaveBeenCalled();
    });

    it('runs when no prior completed run exists', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal()]);

      await step.execute(CTX);

      expect(uexGet).toHaveBeenCalledWith('/terminals');
    });

    it('runs when last completed run was more than 12 hours ago', async () => {
      const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000);
      const dsQuery = buildDsQuery({ lastRunDate: oldDate });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal()]);

      await step.execute(CTX);

      expect(uexGet).toHaveBeenCalledWith('/terminals');
    });
  });

  describe('type mapping', () => {
    it.each([
      ['commodity', 'commodity'],
      ['item', 'item'],
      ['commodity_raw', 'commodity_raw'],
      ['vehicle_buy', 'vehicle_buy'],
      ['vehicle_rent', 'vehicle_rent'],
      ['fuel', 'fuel'],
      ['refinery_audit', 'refinery_audit'],
      ['refinery', 'refinery_audit'],
      ['vehicle', 'vehicle_buy'],
    ])('maps UEX type "%s" → "%s"', async (rawType, expectedType) => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ type: rawType })]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall).toBeDefined();
      expect(upsertCall[1][6]).toBe(expectedType); // type is $7
    });

    it('skips terminal with unknown type and emits warning', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ type: 'unknown_type' })]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining("unknown type 'unknown_type'"),
        }),
      );
      expect(
        dsQuery.mock.calls.find(([sql]: [string]) =>
          sql.includes('INSERT INTO station_terminal'),
        ),
      ).toBeUndefined();
    });
  });

  describe('FK resolution — primary location', () => {
    it('upserts terminal with resolved space_station FK', async () => {
      const dsQuery = buildDsQuery({ spaceStations: { 10: 100 } });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ id_space_station: 10 })]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][10]).toBe(100); // space_station_id ($11)
      expect(upsertCall[1][11]).toBeNull(); // outpost_id ($12)
      expect(upsertCall[1][12]).toBeNull(); // city_id ($13)
    });

    it('upserts terminal with resolved outpost FK when no space station', async () => {
      const dsQuery = buildDsQuery({
        spaceStations: {},
        outposts: { 20: 200 },
      });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id_space_station: null, id_outpost: 20 }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][10]).toBeNull();
      expect(upsertCall[1][11]).toBe(200);
      expect(upsertCall[1][12]).toBeNull();
    });

    it('upserts terminal with resolved city FK when no space station or outpost', async () => {
      const dsQuery = buildDsQuery({ spaceStations: {}, cities: { 30: 300 } });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id_space_station: null, id_outpost: null, id_city: 30 }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][10]).toBeNull();
      expect(upsertCall[1][11]).toBeNull();
      expect(upsertCall[1][12]).toBe(300);
    });
  });

  describe('FK resolution — secondary columns', () => {
    it('resolves star_system_id, planet_id, orbit_id, faction_id, company_id to local BIGINT ids', async () => {
      const dsQuery = buildDsQuery({
        starSystems: { 1: 1001 },
        planets: { 2: 1002 },
        orbits: { 3: 1003 },
        factions: { 5: 1005 },
        companies: { 6: 1006 },
      });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({
          id_star_system: 1,
          id_planet: 2,
          id_orbit: 3,
          id_moon: null,
          id_faction: 5,
          id_company: 6,
        }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][14]).toBe(1001); // star_system_id ($15)
      expect(upsertCall[1][15]).toBe(1002); // planet_id ($16)
      expect(upsertCall[1][16]).toBe(1003); // orbit_id ($17)
      expect(upsertCall[1][17]).toBeNull(); // moon_id ($18)
      expect(upsertCall[1][18]).toBe(1005); // faction_id ($19)
      expect(upsertCall[1][19]).toBe(1006); // company_id ($20)
    });

    it('resolves poi_id to local BIGINT id', async () => {
      const dsQuery = buildDsQuery({ pois: { 7: 1007 } });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ id_poi: 7 })]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][13]).toBe(1007); // poi_id ($14)
    });

    it('nulls poi_id when uex_id not in local tables', async () => {
      const dsQuery = buildDsQuery({ pois: {} });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ id_poi: 99 })]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][13]).toBeNull(); // poi_id ($14)
    });

    it('nulls secondary FKs when uex_id not in local tables', async () => {
      const dsQuery = buildDsQuery({
        starSystems: {},
        planets: {},
        orbits: {},
        factions: {},
        companies: {},
      });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({
          id_star_system: 99,
          id_planet: 99,
          id_orbit: 99,
          id_faction: 99,
          id_company: 99,
        }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][14]).toBeNull();
      expect(upsertCall[1][15]).toBeNull();
      expect(upsertCall[1][16]).toBeNull();
      expect(upsertCall[1][18]).toBeNull();
      expect(upsertCall[1][19]).toBeNull();
    });

    it('passes null for secondary FKs when UEX fields are null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({
          id_star_system: null,
          id_planet: null,
          id_orbit: null,
          id_moon: null,
          id_poi: null,
          id_faction: null,
          id_company: null,
        }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][13]).toBeNull(); // poi_id
      expect(upsertCall[1][14]).toBeNull(); // star_system_id
      expect(upsertCall[1][15]).toBeNull(); // planet_id
      expect(upsertCall[1][16]).toBeNull(); // orbit_id
      expect(upsertCall[1][17]).toBeNull(); // moon_id
      expect(upsertCall[1][18]).toBeNull(); // faction_id
      expect(upsertCall[1][19]).toBeNull(); // company_id
    });
  });

  describe('upsert', () => {
    it('maps boolean flags correctly', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ is_available: 1, is_cargo_center: 0 }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][20]).toBe(true); // is_available ($21)
      expect(upsertCall[1][27]).toBe(false); // is_cargo_center ($28)
    });

    it('does not write to station_etl_run_state (run tracking is handled by runStep)', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal()]);

      await step.execute(CTX);

      const stateInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('station_etl_run_state'),
      );
      expect(stateInsert).toBeUndefined();
    });

    it('processes multiple terminals', async () => {
      const dsQuery = buildDsQuery({ spaceStations: { 10: 100, 11: 101 } });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id: 1, id_space_station: 10 }),
        makeTerminal({
          id: 2,
          name: 'Lorville Terminal',
          code: 'LT',
          id_space_station: 11,
        }),
      ]);

      await step.execute(CTX);

      const upsertCalls = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCalls).toHaveLength(2);
    });

    it('resets all rows to epoch at start, writes epoch in INSERTs, and advances synced_at only after all records written', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal()]);

      await step.execute(CTX);

      // Epoch-reset fires before the API call so untouched rows can't hold a
      // stale non-epoch timestamp if the run fails mid-way
      const epochReset = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_terminal') &&
          sql.includes("synced_at = 'epoch'") &&
          !sql.includes('INSERT'),
      );
      expect(epochReset).toBeDefined();
      const epochResetIdx = dsQuery.mock.calls.indexOf(epochReset!);
      expect(uexGet).toHaveBeenCalled();
      // epoch-reset must precede the first INSERT
      const firstInsertIdx = dsQuery.mock.calls.findIndex(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(epochResetIdx).toBeLessThan(firstInsertIdx);

      // Individual INSERTs also write epoch
      const insertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(insertCall![0]).toContain("'epoch'");

      // Final UPDATE advances synced_at to NOW() after the loop completes
      const finalUpdate = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_terminal') &&
          sql.includes('synced_at = NOW()'),
      );
      expect(finalUpdate).toBeDefined();
    });
  });

  describe('warnings', () => {
    it('skips terminal with missing name and emits warning', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ name: '' })]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: 'Terminal missing name',
        }),
      );
      expect(
        dsQuery.mock.calls.find(([sql]: [string]) =>
          sql.includes('INSERT INTO station_terminal'),
        ),
      ).toBeUndefined();
    });

    it('warns and nulls space_station FK when space station is not found', async () => {
      const dsQuery = buildDsQuery({ spaceStations: {} });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ id_space_station: 99 })]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown space station 99'),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall).toBeDefined();
      expect(upsertCall[1][10]).toBeNull();
    });

    it('warns and nulls outpost FK when outpost is not found', async () => {
      const dsQuery = buildDsQuery({ spaceStations: {}, outposts: {} });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id_space_station: null, id_outpost: 99 }),
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown outpost 99'),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall).toBeDefined();
      expect(upsertCall[1][11]).toBeNull();
    });

    it('warns and nulls city FK when city is not found', async () => {
      const dsQuery = buildDsQuery({ spaceStations: {}, cities: {} });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id_space_station: null, id_outpost: null, id_city: 99 }),
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown city 99'),
        }),
      );
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall).toBeDefined();
      expect(upsertCall[1][12]).toBeNull();
    });

    it('warns when terminal has no location parent and still upserts', async () => {
      const dsQuery = buildDsQuery({ spaceStations: {} });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({
          id_space_station: null,
          id_outpost: null,
          id_city: null,
        }),
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('no location parent'),
        }),
      );
      expect(
        dsQuery.mock.calls.find(([sql]: [string]) =>
          sql.includes('INSERT INTO station_terminal'),
        ),
      ).toBeDefined();
    });
  });
});
