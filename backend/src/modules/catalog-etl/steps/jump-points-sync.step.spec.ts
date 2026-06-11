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
    id_orbit_origin: 100,
    id_orbit_destination: 200,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

// Builds a query mock: returns reference data rows and { cnt: '0' } for reverse-check queries
function buildDsQuery(
  knownStarSystems: number[],
  knownOrbits: number[],
  reverseExists = false,
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM station_star_system'))
      return Promise.resolve(knownStarSystems.map((id) => ({ uex_id: id })));
    if (sql.includes('FROM station_orbit'))
      return Promise.resolve(knownOrbits.map((id) => ({ uex_id: id })));
    if (sql.includes('COUNT(*)'))
      return Promise.resolve([{ cnt: reverseExists ? '1' : '0' }]);
    // DELETE stale synthetic — return empty
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

  it('upserts both the real row and a synthetic reverse row when no reverse exists', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200], false);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    expect(inserts).toHaveLength(2);
  });

  it('does not create synthetic row when real reverse row already exists', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200], true);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    expect(inserts).toHaveLength(1); // only the real row
  });

  it('real row id is a valid UUID', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 1 })]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    expect(inserts[0][1][0]).toMatch(UUID_REGEX);
  });

  it('real row has correct field mapping', async () => {
    uexGet.mockResolvedValue([
      makeJumpPoint({
        id: 5,
        id_star_system_origin: 10,
        id_star_system_destination: 20,
        id_orbit_origin: 100,
        id_orbit_destination: 200,
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
    expect(p[4]).toBe(100); // orbit_origin_uex_id
    expect(p[5]).toBe(200); // orbit_dest_uex_id
    expect(p[6]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
    expect(p[7]).toEqual(new Date(1600000100 * 1000)); // uex_date_modified
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

  it('synthetic row swaps origin/destination and orbits', async () => {
    uexGet.mockResolvedValue([
      makeJumpPoint({
        id: 5,
        id_star_system_origin: 10,
        id_star_system_destination: 20,
        id_orbit_origin: 100,
        id_orbit_destination: 200,
      }),
    ]);
    const dsQuery = buildDsQuery([10, 20], [100, 200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const inserts = dsQuery.mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO station_jump_point'),
    );
    const p = inserts[1][1] as unknown[];
    expect(p[1]).toBe(20); // origin = original destination
    expect(p[2]).toBe(10); // dest = original origin
    expect(p[3]).toBe(200); // orbit_origin = original destination orbit
    expect(p[4]).toBe(100); // orbit_dest = original origin orbit
    expect(p[5]).toBe(5); // source_uex_id = real row uex_id
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

  it('warns and nulls out orbit when origin orbit is unknown — row still inserted', async () => {
    uexGet.mockResolvedValue([makeJumpPoint({ id: 13, id_orbit_origin: 999 })]);
    const dsQuery = buildDsQuery([10, 20], [200]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_orbit_origin_id: 999 }),
      }),
    );
    // Row is still inserted with null orbit
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('warns and nulls out orbit when destination orbit is unknown — row still inserted', async () => {
    uexGet.mockResolvedValue([
      makeJumpPoint({ id: 14, id_orbit_destination: 999 }),
    ]);
    const dsQuery = buildDsQuery([10, 20], [100]);
    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        rawPayload: expect.objectContaining({ missing_orbit_dest_id: 999 }),
      }),
    );
    expect(
      dsQuery.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT INTO station_jump_point'),
      ).length,
    ).toBeGreaterThanOrEqual(1);
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
    // Second run's synthetic id should equal first run's
    expect(inserts[1][1][0]).toBe(inserts[3][1][0]);
    // Real row ids (UUIDv7) differ between runs
    expect(inserts[0][1][0]).not.toBe(inserts[2][1][0]);
  });
});
