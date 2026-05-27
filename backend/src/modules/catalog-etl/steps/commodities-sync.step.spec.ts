import { CommoditiesSyncStep } from './commodities-sync.step';

const CTX = { runId: 'test-run-id' };

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeCommodity(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Agricium',
    code: 'AGRI',
    slug: 'agricium',
    kind: 'Metal',
    id_parent: null,
    id_company: 10,
    weight_scu: 1,
    price_buy: 1250.0,
    price_sell: 1300.0,
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_extractable: 0,
    is_mineral: 0,
    is_raw: 0,
    is_pure: 0,
    is_refined: 0,
    is_refinable: 0,
    is_harvestable: 0,
    is_buyable: 1,
    is_sellable: 1,
    is_temporary: 0,
    is_illegal: 0,
    is_volatile_qt: 0,
    is_volatile_time: 0,
    is_inert: 0,
    is_explosive: 0,
    is_buggy: 0,
    is_fuel: 0,
    wiki: null,
    date_added: 1700000000,
    date_modified: 1710000000,
    ...overrides,
  };
}

// By default returns known company uex_id=10 (matches makeCommodity default id_company).
// Returns [] for all other queries (UPDATE, etc.).
function buildDsQuery(knownCompanyIds: number[] = [10]): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('SELECT uex_id FROM station_company')) {
      return Promise.resolve(knownCompanyIds.map((id) => ({ uex_id: id })));
    }
    return Promise.resolve([]);
  });
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new CommoditiesSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('CommoditiesSyncStep', () => {
  let uexGet: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('commodity upsert', () => {
    it('inserts with parent_uex_id=NULL literal in pass 1a', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toMatch(/VALUES\s*\(\s*\$1,NULL,\$2/);
    });

    it('has ON CONFLICT (uex_id) DO UPDATE SET; parent_uex_id not in DO UPDATE', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
      expect(insert[0]).not.toContain('parent_uex_id=EXCLUDED.parent_uex_id');
    });

    it('params array has exactly 32 entries matching $1..$32', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1]).toHaveLength(32);
      expect(insert[1][30]).toBeInstanceOf(Date); // $31 uex_date_added
      expect(insert[1][31]).toBeInstanceOf(Date); // $32 uex_date_modified
      expect(insert[0]).toMatch(/\$32,NOW\(\)/);
    });

    it('stores code, slug, kind, price_buy, price_sell correctly', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeCommodity({
          code: 'DIAM',
          slug: 'diamond',
          kind: 'Gem',
          price_buy: 9999.5,
          price_sell: 10500.25,
        }),
      ]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1][3]).toBe('DIAM'); // $4 code
      expect(insert[1][4]).toBe('diamond'); // $5 slug
      expect(insert[1][5]).toBe('Gem'); // $6 kind
      expect(insert[1][7]).toBe(9999.5); // $8 price_buy
      expect(insert[1][8]).toBe(10500.25); // $9 price_sell
    });

    it('null slug and kind stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ slug: null, kind: null })]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1][4]).toBeNull(); // $5 slug
      expect(insert[1][5]).toBeNull(); // $6 kind
    });

    it('boolean flags stored as booleans', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeCommodity({ is_illegal: 1, is_harvestable: 1, is_raw: 1 }),
      ]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      // is_raw=$15 (index 14), is_harvestable=$19 (index 18), is_illegal=$23 (index 22)
      expect(insert[1][14]).toBe(true); // is_raw
      expect(insert[1][18]).toBe(true); // is_harvestable
      expect(insert[1][22]).toBe(true); // is_illegal
    });

    it('skips commodity with no name and emits warn', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ name: '' })]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('empty commodity list produces no inserts', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT'),
      );
      expect(insert).toBeUndefined();
    });
  });

  describe('company FK', () => {
    it('stores known id_company as company_uex_id ($2, index [1])', async () => {
      const dsQuery = buildDsQuery([42]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ id_company: 42 })]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1][1]).toBe(42); // $2 company_uex_id
    });

    it('null id_company stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ id_company: null })]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1][1]).toBeNull();
    });

    it('unknown id_company coerced to null and emits warn', async () => {
      const dsQuery = buildDsQuery([]); // no known companies
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ id_company: 99 })]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1][1]).toBeNull();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown company uex_id=99'),
        }),
      );
    });
  });

  describe('parent_uex_id two-pass', () => {
    it('pass 1a inserts with NULL parent_uex_id; pass 1b issues UPDATE to set it', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Parent (id=1) and child (id=2, id_parent=1) both in payload
      uexGet.mockResolvedValueOnce([
        makeCommodity({ id: 1 }),
        makeCommodity({ id: 2, name: 'Agricium Ore', id_parent: 1 }),
      ]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toMatch(/VALUES\s*\(\s*\$1,NULL,\$2/);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_commodity') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toEqual([1, 2]); // [id_parent, uex_id]
    });

    it('skips UPDATE and emits warn when id_parent is not in the upserted set', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Commodity references parent 999 which is not in the current payload
      uexGet.mockResolvedValueOnce([makeCommodity({ id: 2, id_parent: 999 })]);

      await step.execute(CTX);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_commodity') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown parent uex_id=999'),
        }),
      );
    });

    it('no UPDATE issued for commodities without a parent', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ id_parent: null })]);

      await step.execute(CTX);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_commodity') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeUndefined();
    });

    it('pass 1c clears parent_uex_id for de-parented commodities', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ id: 1, id_parent: null })]);

      await step.execute(CTX);

      const clearCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_commodity') &&
          sql.includes('parent_uex_id = NULL'),
      );
      expect(clearCall).toBeDefined();
      expect(clearCall[1][0]).toContain(1);
    });

    it('root-level commodities (no id_parent) emit no warning', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity({ id_parent: null })]);

      await step.execute(CTX);

      expect(repoSave).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('ON CONFLICT (uex_id) DO UPDATE SET present; parent_uex_id not overwritten on conflict', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
      expect(insert[0]).not.toContain('parent_uex_id=EXCLUDED.parent_uex_id');
    });
  });
});
