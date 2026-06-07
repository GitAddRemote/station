import { CitiesSyncStep } from './cities-sync.step';
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

function makeCity(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system: 10,
    id_planet: 20,
    id_moon: null,
    id_orbit: 100,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Lorville',
    code: 'LOR',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 0,
    is_monitored: 1,
    is_armistice: 0,
    is_landable: 1,
    is_decommissioned: 0,
    has_quantum_marker: 1,
    has_trade_terminal: 1,
    has_habitation: 1,
    has_refinery: 0,
    has_cargo_center: 0,
    has_clinic: 1,
    has_food: 1,
    has_shops: 1,
    has_refuel: 0,
    has_repair: 0,
    has_gravity: 1,
    has_loading_dock: 1,
    has_docking_port: 0,
    has_freight_elevator: 1,
    pad_types: 'S,M',
    wiki: null,
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
  return new CitiesSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('CitiesSyncStep', () => {
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

  it('upserts a city with resolved planet and orbit', async () => {
    uexGet.mockResolvedValue([
      makeCity({ id: 1 }),
      makeCity({ id: 2, name: 'New Babbage' }),
    ]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/cities');
    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][0]).toBe(1);
    expect(upserts[1][1][0]).toBe(2);
  });

  it('maps all scalar fields correctly', async () => {
    uexGet.mockResolvedValue([
      makeCity({
        id: 5,
        id_star_system: 10,
        id_planet: 20,
        id_moon: null,
        id_orbit: 100,
        id_faction: 3,
        id_jurisdiction: 7,
        name: 'Lorville',
        code: 'LOR',
        is_available: 0,
        is_landable: 1,
        has_trade_terminal: 1,
        pad_types: 'S,M',
        wiki: 'https://wiki.example.com',
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);
    const dsQuery = buildDsQuery([10], [20], [], [100], [3], [7]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    )!;
    const p = upsertCall[1] as unknown[];
    expect(p[0]).toBe(5); // uex_id
    expect(p[1]).toBe(10); // star_system_uex_id
    expect(p[2]).toBe(20); // planet_uex_id
    expect(p[3]).toBeNull(); // moon_uex_id
    expect(p[4]).toBe(100); // orbit_uex_id
    expect(p[5]).toBe(3); // faction_uex_id
    expect(p[6]).toBe(7); // jurisdiction_uex_id
    expect(p[7]).toBe('Lorville'); // name
    expect(p[8]).toBe('LOR'); // code
    expect(p[9]).toBe(false); // is_available
    expect(p[16]).toBe(false); // is_decommissioned
    expect(p[31]).toEqual(['S', 'M']); // pad_types
    expect(p[32]).toBe('https://wiki.example.com'); // wiki
    expect(p[33]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
  });

  it('warns and skips when city has no name', async () => {
    uexGet.mockResolvedValue([makeCity({ id: 10, name: '' })]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'City missing name',
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_city'),
      ),
    ).toHaveLength(0);
  });

  it('skips with error when both planet and moon are null', async () => {
    uexGet.mockResolvedValue([
      makeCity({ id: 11, id_planet: null, id_moon: null }),
    ]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('no resolvable planet or moon'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_city'),
      ),
    ).toHaveLength(0);
  });

  it('skips with error when planet and moon both fail resolution', async () => {
    uexGet.mockResolvedValue([
      makeCity({ id: 12, id_planet: 999, id_moon: 888 }),
    ]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_city'),
      ),
    ).toHaveLength(0);
  });

  it('resolves via moon when planet is null, still upserts', async () => {
    uexGet.mockResolvedValue([
      makeCity({ id: 13, id_planet: null, id_moon: 30 }),
    ]);
    const dsQuery = buildDsQuery([10], [], [30], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_city'),
      ),
    ).toHaveLength(1);
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    )!;
    expect(upsertCall[1][2]).toBeNull(); // planet_uex_id null
    expect(upsertCall[1][3]).toBe(30); // moon_uex_id resolved
  });

  it('nulls out unknown star system and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeCity({ id: 14, id_star_system: 999 })]);
    const dsQuery = buildDsQuery([], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_star_system_id: 999 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    )!;
    expect(upsertCall[1][1]).toBeNull(); // star_system_uex_id nulled
  });

  it('nulls out unknown orbit and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeCity({ id: 15, id_orbit: 999 })]);
    const dsQuery = buildDsQuery([10], [20], [], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_orbit_id: 999 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    )!;
    expect(upsertCall[1][4]).toBeNull(); // orbit_uex_id nulled
  });

  it('nulls out unknown faction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeCity({ id: 16, id_faction: 88 })]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_faction_id: 88 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    )!;
    expect(upsertCall[1][5]).toBeNull(); // faction_uex_id nulled
  });

  it('nulls out unknown jurisdiction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeCity({ id: 17, id_jurisdiction: 77 })]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_jurisdiction_id: 77 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    )!;
    expect(upsertCall[1][6]).toBeNull(); // jurisdiction_uex_id nulled
  });

  it('is idempotent — second run produces same upsert call', async () => {
    const city = makeCity({ id: 1 });
    uexGet.mockResolvedValue([city]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });
    await step.execute({ runId: RUN_ID });

    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_city'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1]).toEqual(upserts[1][1]);
  });

  it('skips locally managed rows silently when upstream data matches', async () => {
    const city = makeCity({ id: 42 });
    uexGet.mockResolvedValue([city]);
    const storedRow = {
      uex_id: 42,
      star_system_uex_id: city.id_star_system,
      planet_uex_id: city.id_planet,
      moon_uex_id: city.id_moon,
      orbit_uex_id: city.id_orbit,
      faction_uex_id: city.id_faction,
      jurisdiction_uex_id: city.id_jurisdiction,
      name: city.name,
      is_available: Boolean(city.is_available),
      is_available_live: Boolean(city.is_available_live),
      is_visible: Boolean(city.is_visible),
      is_default: Boolean(city.is_default),
      is_monitored: Boolean(city.is_monitored),
      is_armistice: Boolean(city.is_armistice),
      is_landable: Boolean(city.is_landable),
      is_decommissioned: Boolean(city.is_decommissioned),
      has_quantum_marker: Boolean(city.has_quantum_marker),
      has_trade_terminal: Boolean(city.has_trade_terminal),
      has_habitation: Boolean(city.has_habitation),
      has_refinery: Boolean(city.has_refinery),
      has_cargo_center: Boolean(city.has_cargo_center),
      has_clinic: Boolean(city.has_clinic),
      has_food: Boolean(city.has_food),
      has_shops: Boolean(city.has_shops),
      has_refuel: Boolean(city.has_refuel),
      has_repair: Boolean(city.has_repair),
      has_gravity: Boolean(city.has_gravity),
      has_loading_dock: Boolean(city.has_loading_dock),
      has_docking_port: Boolean(city.has_docking_port),
      has_freight_elevator: Boolean(city.has_freight_elevator),
    };
    const dsQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('WHERE is_locally_managed = TRUE'))
        return Promise.resolve([storedRow]);
      if (sql.includes('FROM station_star_system'))
        return Promise.resolve([{ uex_id: 10 }]);
      if (sql.includes('FROM station_planet'))
        return Promise.resolve([{ uex_id: 20 }]);
      if (sql.includes('FROM station_moon')) return Promise.resolve([]);
      if (sql.includes('FROM station_orbit'))
        return Promise.resolve([{ uex_id: 100 }]);
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
        (c[0] as string).includes('INSERT INTO station_city'),
      ),
    ).toHaveLength(0);
  });

  it('warns when locally managed row has upstream drift — does not upsert', async () => {
    const city = makeCity({ id: 42, is_available_live: 0 });
    uexGet.mockResolvedValue([city]);
    const storedRow = {
      uex_id: 42,
      star_system_uex_id: city.id_star_system,
      planet_uex_id: city.id_planet,
      moon_uex_id: city.id_moon,
      orbit_uex_id: city.id_orbit,
      faction_uex_id: city.id_faction,
      jurisdiction_uex_id: city.id_jurisdiction,
      name: city.name,
      is_available: Boolean(city.is_available),
      is_available_live: true, // stored=true, upstream=false → drift
      is_visible: Boolean(city.is_visible),
      is_default: Boolean(city.is_default),
      is_monitored: Boolean(city.is_monitored),
      is_armistice: Boolean(city.is_armistice),
      is_landable: Boolean(city.is_landable),
      is_decommissioned: Boolean(city.is_decommissioned),
      has_quantum_marker: Boolean(city.has_quantum_marker),
      has_trade_terminal: Boolean(city.has_trade_terminal),
      has_habitation: Boolean(city.has_habitation),
      has_refinery: Boolean(city.has_refinery),
      has_cargo_center: Boolean(city.has_cargo_center),
      has_clinic: Boolean(city.has_clinic),
      has_food: Boolean(city.has_food),
      has_shops: Boolean(city.has_shops),
      has_refuel: Boolean(city.has_refuel),
      has_repair: Boolean(city.has_repair),
      has_gravity: Boolean(city.has_gravity),
      has_loading_dock: Boolean(city.has_loading_dock),
      has_docking_port: Boolean(city.has_docking_port),
      has_freight_elevator: Boolean(city.has_freight_elevator),
    };
    const dsQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('WHERE is_locally_managed = TRUE'))
        return Promise.resolve([storedRow]);
      if (sql.includes('FROM station_star_system'))
        return Promise.resolve([{ uex_id: 10 }]);
      if (sql.includes('FROM station_planet'))
        return Promise.resolve([{ uex_id: 20 }]);
      if (sql.includes('FROM station_moon')) return Promise.resolve([]);
      if (sql.includes('FROM station_orbit'))
        return Promise.resolve([{ uex_id: 100 }]);
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
          drifted_fields: expect.arrayContaining(['is_available_live']),
        }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_city'),
      ),
    ).toHaveLength(0);
  });
});
