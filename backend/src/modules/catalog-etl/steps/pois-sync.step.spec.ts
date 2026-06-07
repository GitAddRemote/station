import { PoisSyncStep } from './pois-sync.step';
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

function makePoi(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system: 10,
    id_planet: 20,
    id_moon: null,
    id_orbit: null,
    id_space_station: null,
    id_city: null,
    id_outpost: null,
    id_faction: null,
    id_jurisdiction: null,
    name: 'R&R HUR-L1',
    nickname: null,
    subtype: null,
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 0,
    is_monitored: 0,
    is_armistice: 0,
    is_landable: 1,
    is_decommissioned: 0,
    has_quantum_marker: 1,
    has_trade_terminal: 0,
    has_habitation: 0,
    has_refinery: 0,
    has_cargo_center: 0,
    has_clinic: 0,
    has_food: 0,
    has_shops: 0,
    has_refuel: 0,
    has_repair: 0,
    has_gravity: 0,
    has_loading_dock: 0,
    has_docking_port: 0,
    has_freight_elevator: 0,
    pad_types: null,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function buildDsQuery(
  knownStarSystems: number[],
  knownPlanets: number[],
  knownMoons: number[],
  knownOrbits: number[],
  knownSpaceStations: number[],
  knownCities: number[],
  knownOutposts: number[],
  knownFactions: number[] = [],
  knownJurisdictions: number[] = [],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM station_star_system'))
      return Promise.resolve(knownStarSystems.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_planet'))
      return Promise.resolve(knownPlanets.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_moon'))
      return Promise.resolve(knownMoons.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_orbit'))
      return Promise.resolve(knownOrbits.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_space_station'))
      return Promise.resolve(knownSpaceStations.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_city'))
      return Promise.resolve(knownCities.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_outpost'))
      return Promise.resolve(knownOutposts.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_faction'))
      return Promise.resolve(knownFactions.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_jurisdiction'))
      return Promise.resolve(knownJurisdictions.map((id) => ({ uex_id: id })));
    return Promise.resolve([]);
  });
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new PoisSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('PoisSyncStep', () => {
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

  it('upserts a POI with resolved planet', async () => {
    uexGet.mockResolvedValue([
      makePoi({ id: 1 }),
      makePoi({ id: 2, name: 'Distribution Center Hurston' }),
    ]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/poi');
    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][0]).toBe(1);
    expect(upserts[1][1][0]).toBe(2);
  });

  it('maps all scalar fields correctly', async () => {
    uexGet.mockResolvedValue([
      makePoi({
        id: 5,
        id_star_system: 10,
        id_planet: 20,
        id_moon: null,
        id_orbit: 100,
        id_space_station: 200,
        id_city: 50,
        id_outpost: 60,
        id_faction: 3,
        id_jurisdiction: 7,
        name: 'R&R HUR-L1',
        nickname: 'HUR-L1',
        is_available: 0,
        is_landable: 1,
        has_quantum_marker: 1,
        pad_types: 'S,M',
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);
    const dsQuery = buildDsQuery(
      [10],
      [20],
      [],
      [100],
      [200],
      [50],
      [60],
      [3],
      [7],
    );
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    )!;
    const p = upsertCall[1] as unknown[];
    expect(p[0]).toBe(5); // uex_id
    expect(p[1]).toBe(10); // star_system_uex_id
    expect(p[2]).toBe(20); // planet_uex_id
    expect(p[3]).toBeNull(); // moon_uex_id
    expect(p[4]).toBe(100); // orbit_uex_id
    expect(p[5]).toBe(200); // space_station_uex_id
    expect(p[6]).toBe(50); // city_uex_id
    expect(p[7]).toBe(60); // outpost_uex_id
    expect(p[8]).toBe(3); // faction_uex_id
    expect(p[9]).toBe(7); // jurisdiction_uex_id
    expect(p[10]).toBe('R&R HUR-L1'); // name
    expect(p[11]).toBe('HUR-L1'); // nickname
    expect(p[12]).toBeNull(); // subtype
    expect(p[13]).toBe(false); // is_available
    expect(p[35]).toEqual(['S', 'M']); // pad_types
    expect(p[36]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
  });

  it('stores subtype when present, null when absent', async () => {
    uexGet.mockResolvedValue([
      makePoi({ id: 20, subtype: 'rest_stop' }),
      makePoi({ id: 21, name: 'No Subtype POI', subtype: null }),
    ]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][12]).toBe('rest_stop'); // subtype at index 12
    expect(upserts[1][1][12]).toBeNull();
  });

  it('warns and skips when POI has no name', async () => {
    uexGet.mockResolvedValue([makePoi({ id: 10, name: '' })]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'POI missing name',
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_poi'),
      ),
    ).toHaveLength(0);
  });

  it('warns (not skips) when all location parents are null — still upserts', async () => {
    uexGet.mockResolvedValue([
      makePoi({
        id: 11,
        id_star_system: null,
        id_planet: null,
        id_moon: null,
        id_orbit: null,
        id_space_station: null,
        id_city: null,
        id_outpost: null,
      }),
    ]);
    const dsQuery = buildDsQuery([], [], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('no resolvable location parent'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_poi'),
      ),
    ).toHaveLength(1);
  });

  it('warns when all location parents fail resolution — still upserts', async () => {
    uexGet.mockResolvedValue([
      makePoi({
        id: 12,
        id_star_system: 999,
        id_planet: 998,
        id_moon: 997,
        id_orbit: 996,
        id_space_station: 995,
        id_city: 994,
        id_outpost: 993,
      }),
    ]);
    const dsQuery = buildDsQuery([], [], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('no resolvable location parent'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_poi'),
      ),
    ).toHaveLength(1);
  });

  it('nulls out unknown star system and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makePoi({ id: 13, id_star_system: 999 })]);
    const dsQuery = buildDsQuery([], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_star_system_id: 999 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    )!;
    expect(upsertCall[1][1]).toBeNull(); // star_system_uex_id nulled
  });

  it('nulls out unknown space station and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makePoi({ id: 14, id_space_station: 555 })]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_space_station_id: 555 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    )!;
    expect(upsertCall[1][5]).toBeNull(); // space_station_uex_id nulled
  });

  it('nulls out unknown outpost and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makePoi({ id: 15, id_outpost: 666 })]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_outpost_id: 666 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    )!;
    expect(upsertCall[1][7]).toBeNull(); // outpost_uex_id nulled
  });

  it('nulls out unknown faction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makePoi({ id: 16, id_faction: 88 })]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_faction_id: 88 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    )!;
    expect(upsertCall[1][8]).toBeNull(); // faction_uex_id nulled
  });

  it('nulls out unknown jurisdiction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makePoi({ id: 17, id_jurisdiction: 77 })]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_jurisdiction_id: 77 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    )!;
    expect(upsertCall[1][9]).toBeNull(); // jurisdiction_uex_id nulled
  });

  it('is idempotent — second run produces same upsert call', async () => {
    uexGet.mockResolvedValue([makePoi({ id: 1 })]);
    const dsQuery = buildDsQuery([10], [20], [], [], [], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });
    await step.execute({ runId: RUN_ID });

    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_poi'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1]).toEqual(upserts[1][1]);
  });
});
