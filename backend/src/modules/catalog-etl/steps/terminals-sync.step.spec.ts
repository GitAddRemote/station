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
    id_planet: null,
    id_orbit: null,
    id_moon: null,
    id_faction: null,
    id_company: null,
    contact_url: null,
    screenshot: null,
    max_container_size: null,
    type: 'trading',
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

function buildDsQuery(
  spaceStations: Record<number, number> = { 10: 100 },
  outposts: Record<number, number> = {},
  cities: Record<number, number> = {},
  lastRunDate: Date | null = null,
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('station_etl_run_state') && sql.includes('SELECT')) {
      return Promise.resolve(lastRunDate ? [{ finished_at: lastRunDate }] : []);
    }
    if (sql.includes('station_space_station')) {
      return Promise.resolve(
        Object.entries(spaceStations).map(([uex_id, id]) => ({
          uex_id: Number(uex_id),
          id,
        })),
      );
    }
    if (sql.includes('station_outpost')) {
      return Promise.resolve(
        Object.entries(outposts).map(([uex_id, id]) => ({
          uex_id: Number(uex_id),
          id,
        })),
      );
    }
    if (sql.includes('station_city')) {
      return Promise.resolve(
        Object.entries(cities).map(([uex_id, id]) => ({
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
      const dsQuery = buildDsQuery({ 10: 100 }, {}, {}, recentDate);
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
      const dsQuery = buildDsQuery({ 10: 100 }, {}, {}, oldDate);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal()]);

      await step.execute(CTX);

      expect(uexGet).toHaveBeenCalledWith('/terminals');
    });
  });

  describe('upsert', () => {
    it('upserts terminal with resolved space_station FK', async () => {
      const dsQuery = buildDsQuery({ 10: 100 });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal({ id: 1, id_space_station: 10 })]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall).toBeDefined();
      expect(upsertCall[1][10]).toBe(100); // space_station_id ($11)
      expect(upsertCall[1][11]).toBeNull(); // outpost_id ($12)
      expect(upsertCall[1][12]).toBeNull(); // city_id ($13)
    });

    it('upserts terminal with resolved outpost FK when no space station', async () => {
      const dsQuery = buildDsQuery({}, { 20: 200 });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id_space_station: null, id_outpost: 20 }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][10]).toBeNull(); // space_station_id
      expect(upsertCall[1][11]).toBe(200); // outpost_id
      expect(upsertCall[1][12]).toBeNull(); // city_id
    });

    it('upserts terminal with resolved city FK when no space station or outpost', async () => {
      const dsQuery = buildDsQuery({}, {}, { 30: 300 });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id_space_station: null, id_outpost: null, id_city: 30 }),
      ]);

      await step.execute(CTX);

      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall[1][10]).toBeNull(); // space_station_id
      expect(upsertCall[1][11]).toBeNull(); // outpost_id
      expect(upsertCall[1][12]).toBe(300); // city_id
    });

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
      expect(upsertCall[1][19]).toBe(true); // is_available ($20)
      expect(upsertCall[1][26]).toBe(false); // is_cargo_center ($27)
    });

    it('records completion in station_etl_run_state', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeTerminal()]);

      await step.execute(CTX);

      const stateInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_etl_run_state') &&
          sql.includes('completed'),
      );
      expect(stateInsert).toBeDefined();
      expect(stateInsert[1]).toContain('terminals-sync');
    });

    it('processes multiple terminals', async () => {
      const dsQuery = buildDsQuery({ 10: 100, 11: 101 });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeTerminal({ id: 1, id_space_station: 10 }),
        makeTerminal({
          id: 2,
          name: 'Lorville Terminal',
          id_space_station: 11,
        }),
      ]);

      await step.execute(CTX);

      const upsertCalls = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCalls).toHaveLength(2);
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
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall).toBeUndefined();
    });

    it('warns and nulls space_station FK when space station is not found', async () => {
      const dsQuery = buildDsQuery({});
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
      const dsQuery = buildDsQuery({}, {});
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
      const dsQuery = buildDsQuery({}, {}, {});
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
      const dsQuery = buildDsQuery({}, {}, {});
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
      const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_terminal'),
      );
      expect(upsertCall).toBeDefined();
    });
  });
});
