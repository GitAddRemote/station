import { PlanetsSyncStep } from './planets-sync.step';
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

function makePlanet(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system: 10,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Crusader',
    name_origin: null,
    code: 'CRU',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 0,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

// orbit rows: {uex_id, star_system_uex_id, name} for is_planet=TRUE orbits
function buildDsQuery(
  knownStarSystems: number[],
  planetOrbits: Array<{
    uex_id: number;
    star_system_uex_id: number;
    name: string;
  }> = [],
  knownFactions: number[] = [],
  knownJurisdictions: number[] = [],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM station_star_system'))
      return Promise.resolve(knownStarSystems.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_orbit'))
      return Promise.resolve(planetOrbits);
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
  return new PlanetsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('PlanetsSyncStep', () => {
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

  it('upserts each planet with known star system', async () => {
    uexGet.mockResolvedValue([
      makePlanet({ id: 1 }),
      makePlanet({ id: 2, name: 'Hurston' }),
    ]);
    const dsQuery = buildDsQuery([10]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/planets');
    const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_planet'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][0]).toBe(1);
    expect(upserts[1][1][0]).toBe(2);
  });

  it('populates orbit_uex_id when a matching is_planet orbit exists', async () => {
    const orbit = { uex_id: 500, star_system_uex_id: 10, name: 'Crusader' };
    uexGet.mockResolvedValue([
      makePlanet({ id: 1, name: 'Crusader', id_star_system: 10 }),
    ]);
    const dsQuery = buildDsQuery([10], [orbit]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_planet'),
    )!;
    // $3 = orbit_uex_id
    expect(upsertCall[1][2]).toBe(500);
  });

  it('stores orbit_uex_id as null and warns when no matching orbit found', async () => {
    uexGet.mockResolvedValue([
      makePlanet({ id: 1, name: 'Crusader', id_star_system: 10 }),
    ]);
    const dsQuery = buildDsQuery([10], []); // no planet orbits
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('no matching orbit'),
        rawPayload: expect.objectContaining({ planet_id: 1 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_planet'),
    )!;
    expect(upsertCall[1][2]).toBeNull(); // orbit_uex_id = null
  });

  it('maps all scalar fields correctly', async () => {
    uexGet.mockResolvedValue([
      makePlanet({
        id: 5,
        id_star_system: 10,
        id_faction: 3,
        id_jurisdiction: 7,
        name: 'Hurston',
        name_origin: 'Hurston Dynamics',
        code: 'HUR',
        is_available: 0,
        is_available_live: 0,
        is_visible: 0,
        is_default: 0,
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);
    const orbit = { uex_id: 42, star_system_uex_id: 10, name: 'Hurston' };
    const dsQuery = buildDsQuery([10], [orbit], [3], [7]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_planet'),
    )!;
    const p = upsertCall[1] as unknown[];
    // $1=uex_id, $2=star_system_uex_id, $3=orbit_uex_id, $4=faction_uex_id, $5=jurisdiction_uex_id
    expect(p[0]).toBe(5); // uex_id
    expect(p[1]).toBe(10); // star_system_uex_id
    expect(p[2]).toBe(42); // orbit_uex_id
    expect(p[3]).toBe(3); // faction_uex_id
    expect(p[4]).toBe(7); // jurisdiction_uex_id
    expect(p[5]).toBe('Hurston');
    expect(p[6]).toBe('Hurston Dynamics');
    expect(p[7]).toBe('HUR');
    expect(p[8]).toBe(false); // is_available
    expect(p[11]).toBe(false); // is_default
    expect(p[12]).toEqual(new Date(1600000000 * 1000));

    const sql = upsertCall[0] as string;
    expect(sql).toContain('orbit_uex_id');
  });

  it('skips and warns when planet has no name', async () => {
    uexGet.mockResolvedValue([makePlanet({ id: 10, name: '' })]);
    const dsQuery = buildDsQuery([10]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'Planet missing name',
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_planet'),
      ),
    ).toHaveLength(0);
  });

  it('skips and warns when star system is unknown', async () => {
    uexGet.mockResolvedValue([makePlanet({ id: 11, id_star_system: 999 })]);
    const dsQuery = buildDsQuery([10]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('999'),
        rawPayload: expect.objectContaining({ planet_id: 11 }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_planet'),
      ),
    ).toHaveLength(0);
  });

  it('nulls out faction_uex_id and warns when faction is unknown — still upserts', async () => {
    uexGet.mockResolvedValue([makePlanet({ id: 15, id_faction: 88 })]);
    const dsQuery = buildDsQuery([10]); // faction 88 unknown
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_faction_id: 88 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_planet'),
    )!;
    // $4 = faction_uex_id (after orbit_uex_id shift)
    expect(upsertCall[1][3]).toBeNull();
  });

  it('nulls out jurisdiction_uex_id and warns when jurisdiction is unknown — still upserts', async () => {
    uexGet.mockResolvedValue([makePlanet({ id: 16, id_jurisdiction: 77 })]);
    const dsQuery = buildDsQuery([10]); // jurisdiction 77 unknown
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_jurisdiction_id: 77 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_planet'),
    )!;
    // $5 = jurisdiction_uex_id
    expect(upsertCall[1][4]).toBeNull();
  });
});
