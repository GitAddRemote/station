import { StarSystemsSyncStep } from './star-systems-sync.step';
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

function makeSystem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_faction: null,
    id_jurisdiction: null,
    name: 'Stanton',
    code: 'STA',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 1,
    wiki: null,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new StarSystemsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('StarSystemsSyncStep', () => {
  let uexGet: jest.Mock;
  let dsQuery: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    dsQuery = jest.fn().mockResolvedValue([]);
    repoCreate = jest
      .fn()
      .mockImplementation((dto) => ({ ...dto }) as EtlWarning);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('upserts each star system record', async () => {
    uexGet.mockResolvedValue([
      makeSystem({ id: 1 }),
      makeSystem({ id: 2, name: 'Pyro' }),
    ]);

    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(uexGet).toHaveBeenCalledWith('/star_systems');
    const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_star_system'),
    );
    expect(upserts).toHaveLength(2);
    expect(upserts[0][1][0]).toBe(1);
    expect(upserts[1][1][0]).toBe(2);
  });

  it('maps all scalar fields correctly on upsert', async () => {
    uexGet.mockResolvedValue([
      makeSystem({
        id: 5,
        id_faction: 3,
        id_jurisdiction: 7,
        name: 'Nyx',
        code: 'NYX',
        is_available: 0,
        is_available_live: 0,
        is_visible: 0,
        is_default: 0,
        wiki: 'https://wiki.example.com/nyx',
        date_added: 1600000000,
        date_modified: 1600000100,
      }),
    ]);

    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const params = dsQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(5); // uex_id
    expect(params[1]).toBe(3); // faction_uex_id
    expect(params[2]).toBe(7); // jurisdiction_uex_id
    expect(params[3]).toBe('Nyx'); // name
    expect(params[4]).toBe('NYX'); // code
    expect(params[5]).toBe(false); // is_available
    expect(params[9]).toBe('https://wiki.example.com/nyx'); // wiki
    expect(params[10]).toEqual(new Date(1600000000 * 1000)); // uex_date_added
  });

  it('skips and warns on missing name', async () => {
    uexGet.mockResolvedValue([makeSystem({ id: 10, name: '' })]);

    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        message: 'Star system missing name',
        rawPayload: { id: 10 },
      }),
    );
    expect(repoSave).toHaveBeenCalledTimes(1);
    const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_star_system'),
    );
    expect(upserts).toHaveLength(0);
  });

  it('is idempotent — calls upsert once per record regardless of duplicates', async () => {
    uexGet.mockResolvedValue([makeSystem({ id: 1 }), makeSystem({ id: 1 })]);

    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upserts = dsQuery.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO station_star_system'),
    );
    expect(upserts).toHaveLength(2); // DB ON CONFLICT handles actual dedup
  });

  it('treats null optional FK fields as null in the upsert params', async () => {
    uexGet.mockResolvedValue([
      makeSystem({ id_faction: null, id_jurisdiction: null }),
    ]);

    const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const params = dsQuery.mock.calls[0][1] as unknown[];
    expect(params[1]).toBeNull(); // faction_uex_id
    expect(params[2]).toBeNull(); // jurisdiction_uex_id
  });
});
