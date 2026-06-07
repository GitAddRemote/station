import { SpaceStationsSyncStep } from './space-stations-sync.step';
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

function makeSpaceStation(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system: 10,
    id_planet: null,
    id_moon: null,
    id_orbit: 100,
    id_city: null,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Port Olisar',
    nickname: null,
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 0,
    is_monitored: 1,
    is_armistice: 1,
    is_landable: 1,
    is_decommissioned: 0,
    is_lagrange: 1,
    is_jump_point: 0,
    has_quantum_marker: 1,
    has_trade_terminal: 1,
    has_habitation: 1,
    has_refinery: 0,
    has_cargo_center: 1,
    has_clinic: 1,
    has_food: 1,
    has_shops: 1,
    has_refuel: 1,
    has_repair: 1,
    has_gravity: 1,
    has_loading_dock: 0,
    has_docking_port: 1,
    has_freight_elevator: 0,
    pad_types: 'S,M,L',
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
  knownCities: number[] = [],
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
    if (sql.includes('FROM station_city'))
      return Promise.resolve(knownCities.map((id) => ({ uex_id: id })));
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
  return new SpaceStationsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('SpaceStationsSyncStep', () => {
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

  it('upserts a space station with known orbit', async () => {
    uexGet.mockResolvedValue([
      makeSpaceStation({ id: 1 }),
      makeSpaceStation({ id: 2, name: 'Port Tressler' }),
    ]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/space_stations');
    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_space_station'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][0]).toBe(1);
    expect(upserts[1][1][0]).toBe(2);
  });

  it('maps all scalar fields correctly', async () => {
    uexGet.mockResolvedValue([
      makeSpaceStation({
        id: 5,
        id_star_system: 10,
        id_planet: 20,
        id_moon: null,
        id_orbit: 100,
        id_city: 50,
        id_faction: 3,
        id_jurisdiction: 7,
        name: 'Port Olisar',
        nickname: 'PO',
        is_lagrange: 1,
        is_jump_point: 0,
        has_trade_terminal: 1,
        pad_types: 'S,M,L',
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);
    const dsQuery = buildDsQuery([10], [20], [], [100], [50], [3], [7]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_space_station'),
    )!;
    const p = upsertCall[1] as unknown[];
    expect(p[0]).toBe(5); // uex_id
    expect(p[1]).toBe(10); // star_system_uex_id
    expect(p[2]).toBe(20); // planet_uex_id
    expect(p[3]).toBeNull(); // moon_uex_id
    expect(p[4]).toBe(100); // orbit_uex_id
    expect(p[5]).toBe(50); // city_uex_id
    expect(p[6]).toBe(3); // faction_uex_id
    expect(p[7]).toBe(7); // jurisdiction_uex_id
    expect(p[8]).toBe('Port Olisar'); // name
    expect(p[9]).toBe('PO'); // nickname
    expect(p[18]).toBe(true); // is_lagrange
    expect(p[19]).toBe(false); // is_jump_point
    expect(p[34]).toEqual(['S', 'M', 'L']); // pad_types
    expect(p[35]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
  });

  it('warns and skips when space station has no name', async () => {
    uexGet.mockResolvedValue([makeSpaceStation({ id: 10, name: '' })]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'Space station missing name',
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_space_station'),
      ),
    ).toHaveLength(0);
  });

  it('skips with error when orbit is null', async () => {
    uexGet.mockResolvedValue([makeSpaceStation({ id: 11, id_orbit: null })]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('unknown or missing orbit'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_space_station'),
      ),
    ).toHaveLength(0);
  });

  it('skips with error when orbit is unknown', async () => {
    uexGet.mockResolvedValue([makeSpaceStation({ id: 12, id_orbit: 999 })]);
    const dsQuery = buildDsQuery([10], [], [], []); // orbit 999 not known
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_space_station'),
      ),
    ).toHaveLength(0);
  });

  it('nulls out unknown star system and warns — still upserts', async () => {
    uexGet.mockResolvedValue([
      makeSpaceStation({ id: 13, id_star_system: 999 }),
    ]);
    const dsQuery = buildDsQuery([], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_star_system_id: 999 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_space_station'),
    )!;
    expect(upsertCall[1][1]).toBeNull(); // star_system_uex_id nulled
  });

  it('nulls out unknown city and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeSpaceStation({ id: 14, id_city: 55 })]);
    const dsQuery = buildDsQuery([10], [], [], [100], []); // city 55 unknown
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_city_id: 55 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_space_station'),
    )!;
    expect(upsertCall[1][5]).toBeNull(); // city_uex_id nulled
  });

  it('nulls out unknown faction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeSpaceStation({ id: 15, id_faction: 88 })]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_faction_id: 88 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_space_station'),
    )!;
    expect(upsertCall[1][6]).toBeNull(); // faction_uex_id nulled
  });

  it('nulls out unknown jurisdiction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([
      makeSpaceStation({ id: 16, id_jurisdiction: 77 }),
    ]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_jurisdiction_id: 77 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_space_station'),
    )!;
    expect(upsertCall[1][7]).toBeNull(); // jurisdiction_uex_id nulled
  });

  it('is idempotent — second run produces same upsert call', async () => {
    uexGet.mockResolvedValue([makeSpaceStation({ id: 1 })]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });
    await step.execute({ runId: RUN_ID });

    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_space_station'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1]).toEqual(upserts[1][1]);
  });

  it('skips locally managed rows silently when upstream data matches', async () => {
    const station = makeSpaceStation({ id: 42 });
    uexGet.mockResolvedValue([station]);
    const storedRow = {
      uex_id: 42,
      star_system_uex_id: station.id_star_system,
      planet_uex_id: station.id_planet,
      moon_uex_id: station.id_moon,
      orbit_uex_id: station.id_orbit,
      city_uex_id: station.id_city,
      faction_uex_id: station.id_faction,
      jurisdiction_uex_id: station.id_jurisdiction,
      name: station.name,
      is_available: Boolean(station.is_available),
      is_available_live: Boolean(station.is_available_live),
      is_visible: Boolean(station.is_visible),
      is_default: Boolean(station.is_default),
      is_monitored: Boolean(station.is_monitored),
      is_armistice: Boolean(station.is_armistice),
      is_landable: Boolean(station.is_landable),
      is_decommissioned: Boolean(station.is_decommissioned),
      is_lagrange: Boolean(station.is_lagrange),
      is_jump_point: Boolean(station.is_jump_point),
      has_quantum_marker: Boolean(station.has_quantum_marker),
      has_trade_terminal: Boolean(station.has_trade_terminal),
      has_habitation: Boolean(station.has_habitation),
      has_refinery: Boolean(station.has_refinery),
      has_cargo_center: Boolean(station.has_cargo_center),
      has_clinic: Boolean(station.has_clinic),
      has_food: Boolean(station.has_food),
      has_shops: Boolean(station.has_shops),
      has_refuel: Boolean(station.has_refuel),
      has_repair: Boolean(station.has_repair),
      has_gravity: Boolean(station.has_gravity),
      has_loading_dock: Boolean(station.has_loading_dock),
      has_docking_port: Boolean(station.has_docking_port),
      has_freight_elevator: Boolean(station.has_freight_elevator),
    };
    const dsQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('WHERE is_locally_managed = TRUE'))
        return Promise.resolve([storedRow]);
      if (sql.includes('FROM station_star_system'))
        return Promise.resolve([{ uex_id: 10 }]);
      if (sql.includes('FROM station_planet')) return Promise.resolve([]);
      if (sql.includes('FROM station_moon')) return Promise.resolve([]);
      if (sql.includes('FROM station_orbit'))
        return Promise.resolve([{ uex_id: 100 }]);
      if (sql.includes('FROM station_city')) return Promise.resolve([]);
      if (sql.includes('FROM station_faction')) return Promise.resolve([]);
      if (sql.includes('FROM station_jurisdiction')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('locally managed'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_space_station'),
      ),
    ).toHaveLength(0);
  });

  it('warns when locally managed row has upstream drift — does not upsert', async () => {
    const station = makeSpaceStation({ id: 42, is_lagrange: 0 });
    uexGet.mockResolvedValue([station]);
    const storedRow = {
      uex_id: 42,
      star_system_uex_id: station.id_star_system,
      planet_uex_id: station.id_planet,
      moon_uex_id: station.id_moon,
      orbit_uex_id: station.id_orbit,
      city_uex_id: station.id_city,
      faction_uex_id: station.id_faction,
      jurisdiction_uex_id: station.id_jurisdiction,
      name: station.name,
      is_available: Boolean(station.is_available),
      is_available_live: Boolean(station.is_available_live),
      is_visible: Boolean(station.is_visible),
      is_default: Boolean(station.is_default),
      is_monitored: Boolean(station.is_monitored),
      is_armistice: Boolean(station.is_armistice),
      is_landable: Boolean(station.is_landable),
      is_decommissioned: Boolean(station.is_decommissioned),
      is_lagrange: true, // stored=true, upstream=false → drift
      is_jump_point: Boolean(station.is_jump_point),
      has_quantum_marker: Boolean(station.has_quantum_marker),
      has_trade_terminal: Boolean(station.has_trade_terminal),
      has_habitation: Boolean(station.has_habitation),
      has_refinery: Boolean(station.has_refinery),
      has_cargo_center: Boolean(station.has_cargo_center),
      has_clinic: Boolean(station.has_clinic),
      has_food: Boolean(station.has_food),
      has_shops: Boolean(station.has_shops),
      has_refuel: Boolean(station.has_refuel),
      has_repair: Boolean(station.has_repair),
      has_gravity: Boolean(station.has_gravity),
      has_loading_dock: Boolean(station.has_loading_dock),
      has_docking_port: Boolean(station.has_docking_port),
      has_freight_elevator: Boolean(station.has_freight_elevator),
    };
    const dsQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('WHERE is_locally_managed = TRUE'))
        return Promise.resolve([storedRow]);
      if (sql.includes('FROM station_star_system'))
        return Promise.resolve([{ uex_id: 10 }]);
      if (sql.includes('FROM station_planet')) return Promise.resolve([]);
      if (sql.includes('FROM station_moon')) return Promise.resolve([]);
      if (sql.includes('FROM station_orbit'))
        return Promise.resolve([{ uex_id: 100 }]);
      if (sql.includes('FROM station_city')) return Promise.resolve([]);
      if (sql.includes('FROM station_faction')) return Promise.resolve([]);
      if (sql.includes('FROM station_jurisdiction')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('drifted'),
        rawPayload: expect.objectContaining({
          drifted_fields: expect.arrayContaining(['is_lagrange']),
        }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_space_station'),
      ),
    ).toHaveLength(0);
  });
});
