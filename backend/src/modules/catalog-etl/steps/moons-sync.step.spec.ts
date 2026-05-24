import { MoonsSyncStep } from './moons-sync.step';
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

function makeMoon(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system: 10,
    id_planet: 50,
    id_orbit: 100,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Yela',
    name_origin: null,
    code: 'YEL',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 0,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function buildDsQuery(
  knownStarSystems: number[],
  knownPlanets: number[],
  knownOrbits: number[],
  knownFactions: number[] = [],
  knownJurisdictions: number[] = [],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if ((sql as string).includes('FROM station_star_system'))
      return Promise.resolve(knownStarSystems.map((id) => ({ uex_id: id })));
    if ((sql as string).includes('FROM station_planet'))
      return Promise.resolve(knownPlanets.map((id) => ({ uex_id: id })));
    if ((sql as string).includes('FROM station_orbit'))
      return Promise.resolve(knownOrbits.map((id) => ({ uex_id: id })));
    if ((sql as string).includes('FROM station_faction'))
      return Promise.resolve(knownFactions.map((id) => ({ uex_id: id })));
    if ((sql as string).includes('FROM station_jurisdiction'))
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
  return new MoonsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('MoonsSyncStep', () => {
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

  it('upserts each moon with known star system, planet, and orbit', async () => {
    uexGet.mockResolvedValue([
      makeMoon({ id: 1 }),
      makeMoon({ id: 2, name: 'Cellin' }),
    ]);
    const dsQuery = buildDsQuery([10], [50], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/moons');
    const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_moon'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][0]).toBe(1);
    expect(upserts[1][1][0]).toBe(2);
  });

  it('maps all scalar fields correctly', async () => {
    uexGet.mockResolvedValue([
      makeMoon({
        id: 5,
        id_star_system: 10,
        id_planet: 50,
        id_orbit: 100,
        id_faction: 3,
        id_jurisdiction: 7,
        name: 'Cellin',
        name_origin: null,
        code: 'CEL',
        is_available: 0,
        is_available_live: 0,
        is_visible: 0,
        is_default: 1,
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);
    const dsQuery = buildDsQuery([10], [50], [100], [3], [7]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_moon'),
    )!;
    const p = upsertCall[1] as unknown[];
    expect(p[0]).toBe(5); // uex_id
    expect(p[1]).toBe(10); // star_system_uex_id
    expect(p[2]).toBe(50); // planet_uex_id
    expect(p[3]).toBe(100); // orbit_uex_id
    expect(p[4]).toBe(3); // faction_uex_id
    expect(p[5]).toBe(7); // jurisdiction_uex_id
    expect(p[6]).toBe('Cellin'); // name
    expect(p[7]).toBeNull(); // name_origin
    expect(p[8]).toBe('CEL'); // code
    expect(p[9]).toBe(false); // is_available
    expect(p[12]).toBe(true); // is_default
    expect(p[13]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
  });

  it('skips and warns when moon has no name', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 10, name: '' })]);
    const dsQuery = buildDsQuery([10], [50], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'Moon missing name',
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_moon'),
      ),
    ).toHaveLength(0);
  });

  it('skips and warns when star system is unknown', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 11, id_star_system: 999 })]);
    const dsQuery = buildDsQuery([10], [50], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('999'),
        rawPayload: expect.objectContaining({ moon_id: 11 }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_moon'),
      ),
    ).toHaveLength(0);
  });

  it('skips and warns when planet is unknown', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 12, id_planet: 999 })]);
    const dsQuery = buildDsQuery([10], [50], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: expect.stringContaining('999'),
        rawPayload: expect.objectContaining({ moon_id: 12, id_planet: 999 }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_moon'),
      ),
    ).toHaveLength(0);
  });

  it('skips and warns when id_planet is null', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 13, id_planet: null })]);
    const dsQuery = buildDsQuery([10], [50], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn' }),
    );
    expect(
      dsQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO station_moon'),
      ),
    ).toHaveLength(0);
  });

  it('nulls out orbit_uex_id and warns when orbit is unknown — still upserts', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 14, id_orbit: 999 })]);
    const dsQuery = buildDsQuery([10], [50], []); // orbit 999 unknown
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_orbit_id: 999 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_moon'),
    )!;
    expect(upsertCall[1][3]).toBeNull(); // orbit_uex_id nulled out
  });

  it('treats null id_orbit as null without warning', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 15, id_orbit: null })]);
    const dsQuery = buildDsQuery([10], [50], []);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).not.toHaveBeenCalled();
    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_moon'),
    )!;
    expect(upsertCall[1][3]).toBeNull();
  });

  it('nulls out faction_uex_id and warns when faction is unknown — still upserts', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 16, id_faction: 88 })]);
    const dsQuery = buildDsQuery([10], [50], [100]); // faction 88 unknown
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_faction_id: 88 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_moon'),
    )!;
    expect(upsertCall[1][4]).toBeNull(); // faction_uex_id nulled out
  });

  it('nulls out jurisdiction_uex_id and warns when jurisdiction is unknown — still upserts', async () => {
    uexGet.mockResolvedValue([makeMoon({ id: 17, id_jurisdiction: 77 })]);
    const dsQuery = buildDsQuery([10], [50], [100]); // jurisdiction 77 unknown
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_jurisdiction_id: 77 }),
      }),
    );
    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_moon'),
    )!;
    expect(upsertCall[1][5]).toBeNull(); // jurisdiction_uex_id nulled out
  });
});
