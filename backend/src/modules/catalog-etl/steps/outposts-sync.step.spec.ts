import { OutpostsSyncStep } from './outposts-sync.step';
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

function makeOutpost(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system: 10,
    id_planet: 20,
    id_moon: null,
    id_orbit: 100,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Reclamation & Disposal Orinth',
    nickname: null,
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
    pad_types: 'S',
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
  return new OutpostsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('OutpostsSyncStep', () => {
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

  it('upserts an outpost with resolved planet', async () => {
    uexGet.mockResolvedValue([
      makeOutpost({ id: 1 }),
      makeOutpost({ id: 2, name: 'Shubin Mining Facility SMO-22' }),
    ]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/outposts');
    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_outpost'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][0]).toBe(1);
    expect(upserts[1][1][0]).toBe(2);
  });

  it('maps all scalar fields correctly', async () => {
    uexGet.mockResolvedValue([
      makeOutpost({
        id: 5,
        id_star_system: 10,
        id_planet: 20,
        id_moon: null,
        id_orbit: 100,
        id_faction: 3,
        id_jurisdiction: 7,
        name: 'Shubin SMO-22',
        nickname: 'SMO',
        is_available: 0,
        is_landable: 1,
        has_quantum_marker: 1,
        pad_types: 'S',
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);
    const dsQuery = buildDsQuery([10], [20], [], [100], [3], [7]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_outpost'),
    )!;
    const p = upsertCall[1] as unknown[];
    expect(p[0]).toBe(5); // uex_id
    expect(p[1]).toBe(10); // star_system_uex_id
    expect(p[2]).toBe(20); // planet_uex_id
    expect(p[3]).toBeNull(); // moon_uex_id
    expect(p[4]).toBe(100); // orbit_uex_id
    expect(p[5]).toBe(3); // faction_uex_id
    expect(p[6]).toBe(7); // jurisdiction_uex_id
    expect(p[7]).toBe('Shubin SMO-22'); // name
    expect(p[8]).toBe('SMO'); // nickname
    expect(p[9]).toBe(false); // is_available
    expect(p[31]).toEqual(['S']); // pad_types
    expect(p[32]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
  });

  it('warns and skips when outpost has no name', async () => {
    uexGet.mockResolvedValue([makeOutpost({ id: 10, name: '' })]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'Outpost missing name',
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_outpost'),
      ),
    ).toHaveLength(0);
  });

  it('warns (not skips) when both planet and moon are null — still upserts', async () => {
    uexGet.mockResolvedValue([
      makeOutpost({ id: 11, id_planet: null, id_moon: null }),
    ]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('no resolvable planet or moon'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_outpost'),
      ),
    ).toHaveLength(1);
  });

  it('warns (not skips) when planet and moon both fail resolution — still upserts', async () => {
    uexGet.mockResolvedValue([
      makeOutpost({ id: 12, id_planet: 999, id_moon: 888 }),
    ]);
    const dsQuery = buildDsQuery([10], [], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn' }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_outpost'),
      ),
    ).toHaveLength(1);
  });

  it('nulls out unknown star system and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeOutpost({ id: 13, id_star_system: 999 })]);
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
      (c[0] as string).includes('INSERT INTO station_outpost'),
    )!;
    expect(upsertCall[1][1]).toBeNull(); // star_system_uex_id nulled
  });

  it('nulls out unknown orbit and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeOutpost({ id: 14, id_orbit: 999 })]);
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
      (c[0] as string).includes('INSERT INTO station_outpost'),
    )!;
    expect(upsertCall[1][4]).toBeNull(); // orbit_uex_id nulled
  });

  it('nulls out unknown faction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeOutpost({ id: 15, id_faction: 88 })]);
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
      (c[0] as string).includes('INSERT INTO station_outpost'),
    )!;
    expect(upsertCall[1][5]).toBeNull(); // faction_uex_id nulled
  });

  it('nulls out unknown jurisdiction and warns — still upserts', async () => {
    uexGet.mockResolvedValue([makeOutpost({ id: 16, id_jurisdiction: 77 })]);
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
      (c[0] as string).includes('INSERT INTO station_outpost'),
    )!;
    expect(upsertCall[1][6]).toBeNull(); // jurisdiction_uex_id nulled
  });

  it('is idempotent — second run produces same upsert call', async () => {
    uexGet.mockResolvedValue([makeOutpost({ id: 1 })]);
    const dsQuery = buildDsQuery([10], [20], [], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });
    await step.execute({ runId: RUN_ID });

    const upserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_outpost'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1]).toEqual(upserts[1][1]);
  });
});
