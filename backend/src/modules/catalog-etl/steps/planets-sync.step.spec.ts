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

function buildDsQuery(
  knownStarSystems: number[],
  knownFactions: number[] = [],
  knownJurisdictions: number[] = [],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if ((sql as string).includes('FROM station_star_system'))
      return Promise.resolve(knownStarSystems.map((id) => ({ uex_id: id })));
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

  it('maps all scalar fields correctly and does not include orbit_uex_id or is_lagrange', async () => {
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
    const dsQuery = buildDsQuery([10], [3], [7]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_planet'),
    )!;
    const p = upsertCall[1] as unknown[];
    expect(p[0]).toBe(5); // uex_id
    expect(p[1]).toBe(10); // star_system_uex_id
    expect(p[2]).toBe(3); // faction_uex_id
    expect(p[3]).toBe(7); // jurisdiction_uex_id
    expect(p[4]).toBe('Hurston'); // name
    expect(p[5]).toBe('Hurston Dynamics'); // name_origin
    expect(p[6]).toBe('HUR'); // code
    expect(p[7]).toBe(false); // is_available
    expect(p[10]).toBe(false); // is_default
    expect(p[11]).toEqual(new Date(1600000000 * 1000)); // uex_date_added

    // SQL must not reference orbit_uex_id or is_lagrange
    const sql = upsertCall[0] as string;
    expect(sql).not.toContain('orbit_uex_id');
    expect(sql).not.toContain('is_lagrange');
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

  it('skips and warns when id_star_system is null', async () => {
    uexGet.mockResolvedValue([makePlanet({ id: 12, id_star_system: null })]);
    const dsQuery = buildDsQuery([10]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn' }),
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
    expect(upsertCall[1][2]).toBeNull(); // faction_uex_id nulled out
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
    expect(upsertCall[1][3]).toBeNull(); // jurisdiction_uex_id nulled out
  });
});
