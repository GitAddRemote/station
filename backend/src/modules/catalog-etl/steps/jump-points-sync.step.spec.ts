import { v5 as uuidv5 } from 'uuid';
import { JumpPointsSyncStep } from './jump-points-sync.step';
import { EtlWarning } from '../entities/etl-warning.entity';

const RUN_ID = 'test-run-id';
const SYNTHETIC_JP_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeJumpPoint(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_star_system_origin: 10,
    id_star_system_destination: 20,
    id_orbit_entry: 100,
    id_orbit_exit: 200,
    name: 'Stanton-Pyro',
    size: 'large',
    is_available_live: 1,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function buildDsQuery(
  knownStarSystems: number[],
  knownOrbits: number[],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM station_star_system'))
      return Promise.resolve(knownStarSystems.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_orbit'))
      return Promise.resolve(knownOrbits.map((id) => ({ uex_id: id })));
    return Promise.resolve([]);
  });
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new JumpPointsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('JumpPointsSyncStep', () => {
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

  it('upserts both the real row and a synthetic reverse row', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/jump_points');
    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    expect(inserts).toHaveLength(2);
  });

  it('real row id is a valid UUID', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    expect(inserts[0][1][0]).toMatch(UUID_REGEX); // id is a UUID
  });

  it('real row has correct field mapping', async () => {
    uexGet.mockResolvedValue([
      makeJumpPoint({
        id: 5,
        id_star_system_origin: 10,
        id_star_system_destination: 20,
        id_orbit_entry: 100,
        id_orbit_exit: 200,
        name: 'Stanton-Pyro',
        size: 'large',
        is_available_live: 1,
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    const p = inserts[0][1] as unknown[];
    expect(p[0]).toMatch(UUID_REGEX); // id — UUIDv7
    expect(p[1]).toBe(5); // uex_id
    expect(p[2]).toBe(10); // star_system_origin_uex_id
    expect(p[3]).toBe(20); // star_system_dest_uex_id
    expect(p[4]).toBe(100); // orbit_origin_uex_id (entry)
    expect(p[5]).toBe(200); // orbit_dest_uex_id (exit)
    expect(p[6]).toBe('Stanton-Pyro'); // name
    expect(p[7]).toBe('L'); // size mapped from 'large'
    expect(p[8]).toBe(true); // is_available_live
    expect(p[9]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
    expect(p[10]).toEqual(new Date(1600000100 * 1000)); // uex_date_modified
  });

  it('synthetic row id is a deterministic UUIDv5', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 7 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    const expectedId = uuidv5('synthetic-jp-7', SYNTHETIC_JP_NS);
    expect(inserts[1][1][0]).toBe(expectedId);
  });

  it('synthetic row swaps origin/destination and orbit entry/exit', async () => {
    uexGet.mockResolvedValue([
      makeJumpPoint({
        id: 5,
        id_star_system_origin: 10,
        id_star_system_destination: 20,
        id_orbit_entry: 100,
        id_orbit_exit: 200,
      }),
    ]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    const p = inserts[1][1] as unknown[];
    expect(p[0]).toMatch(UUID_REGEX); // id — deterministic UUID
    expect(p[1]).toBe(20); // origin = original destination
    expect(p[2]).toBe(10); // dest = original origin
    expect(p[3]).toBe(200); // orbit_origin = original exit orbit
    expect(p[4]).toBe(100); // orbit_dest = original entry orbit
    expect(p[8]).toBe(5); // source_uex_id = real row uex_id
  });

  it('synthetic row ON CONFLICT clause uses source_uex_id', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    expect(inserts[1][0] as string).toContain('ON CONFLICT (source_uex_id)');
  });

  it('warns and skips when name is missing', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 10, name: '' })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'Jump point missing name',
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ),
    ).toHaveLength(0);
  });

  it('errors and skips when origin star system is unknown', async () => {
    uexGet.mockResolvedValue([
      makeJumpPoint({ id: 11, id_star_system_origin: 999 }),
    ]);
    const dsQuery = buildDsQuery([20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('origin star system 999'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ),
    ).toHaveLength(0);
  });

  it('errors and skips when destination star system is unknown', async () => {
    uexGet.mockResolvedValue([
      makeJumpPoint({ id: 12, id_star_system_destination: 999 }),
    ]);
    const dsQuery = buildDsQuery([10], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('destination star system 999'),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ),
    ).toHaveLength(0);
  });

  it('warns and skips both rows when entry orbit is unknown', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 13, id_orbit_entry: 999 })]);
    const dsQuery = buildDsQuery([10, 20], [200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_orbit_entry_id: 999 }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ),
    ).toHaveLength(0);
  });

  it('warns and skips both rows when exit orbit is unknown', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 14, id_orbit_exit: 999 })]);
    const dsQuery = buildDsQuery([10, 20], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_orbit_exit_id: 999 }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ),
    ).toHaveLength(0);
  });

  it('maps all known size values correctly', async () => {
    const cases: Array<[string, string]> = [
      ['small', 'S'],
      ['medium', 'M'],
      ['large', 'L'],
      ['extra-large', 'XL'],
      ['xx-large', 'XXL'],
      ['S', 'S'],
      ['M', 'M'],
      ['L', 'L'],
      ['XL', 'XL'],
      ['XXL', 'XXL'],
    ];
    for (const [input, expected] of cases) {
      uexGet.mockResolvedValue([makeJumpPoint({ id: 1, size: input })]);
      const dsQuery = buildDsQuery([10, 20], [100, 200]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      const realInsert = dsQuery.mock.calls.find((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      )!;
      expect(realInsert[1][7]).toBe(expected); // size is now at index 7
      jest.clearAllMocks();
    }
  });

  it('warns and stores null for unknown size — still upserts both rows', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 15, size: 'gigantic' })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ raw_size: 'gigantic' }),
      }),
    );
    const realInsert = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    )!;
    expect(realInsert[1][7]).toBeNull(); // size null at index 7
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ),
    ).toHaveLength(2);
  });

  it('null size does not emit a warning', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 16, size: null })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).not.toHaveBeenCalled();
    const realInsert = dsQuery.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    )!;
    expect(realInsert[1][7]).toBeNull();
  });

  it('synthetic row id is stable across re-runs', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    // Synthetic id is the same both runs; real id is a fresh UUIDv7 each time
    expect(inserts[1][1][0]).toBe(inserts[3][1][0]);
    expect(inserts[0][1][0]).not.toBe(inserts[2][1][0]);
  });

  it('upsert params are otherwise identical across re-runs', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    // All params except id (index 0 of real row) match between runs
    expect(inserts[0][1].slice(1)).toEqual(inserts[2][1].slice(1));
    expect(inserts[1][1]).toEqual(inserts[3][1]); // synthetic fully identical
  });
});
