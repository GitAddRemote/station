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
    kind: 'Metal',
    id_parent: null,
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

function buildDsQuery(): jest.Mock {
  return jest.fn().mockResolvedValue([]);
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
  mapFind: jest.Mock,
) {
  return new CommoditiesSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    { find: mapFind } as never,
    makeLogger() as never,
  );
}

describe('CommoditiesSyncStep', () => {
  let uexGet: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;
  let mapFind: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
    mapFind = jest.fn().mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('commodity upsert', () => {
    it('inserts with parent_uex_id=NULL literal in pass 1a', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toMatch(/VALUES\s*\(\s*\$1,NULL,/);
    });

    it('has ON CONFLICT (uex_id) DO UPDATE SET; parent_uex_id not in DO UPDATE', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
      expect(insert[0]).not.toContain('parent_uex_id=EXCLUDED.parent_uex_id');
    });

    it('params array has exactly 31 entries matching $1..$31', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1]).toHaveLength(30);
      expect(insert[1][28]).toBeInstanceOf(Date); // $29 uex_date_added
      expect(insert[1][29]).toBeInstanceOf(Date); // $30 uex_date_modified
      expect(insert[0]).toMatch(/\$30,NOW\(\)/);
    });

    it('stores code, kind, price_buy, price_sell and clears slug to null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([
        makeCommodity({
          code: 'DIAM',
          kind: 'Gem',
          price_buy: 9999.5,
          price_sell: 10500.25,
        }),
      ]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1][2]).toBe('DIAM'); // $3 code
      expect(insert[1][3]).toBe('Gem'); // $4 kind
      expect(insert[1][5]).toBe(9999.5); // $6 price_buy
      expect(insert[1][6]).toBe(10500.25); // $7 price_sell
      expect(insert[0]).toContain('$2,$3,NULL,$4,$5');
    });

    it('null kind is stored as null and slug is always cleared', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([makeCommodity({ slug: null, kind: null })]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[1][3]).toBeNull(); // $4 kind
      expect(insert[0]).toContain('slug=NULL');
    });

    it('boolean flags stored as booleans', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([
        makeCommodity({ is_illegal: 1, is_harvestable: 1, is_raw: 1 }),
      ]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      // is_raw=$13 (index 12), is_harvestable=$17 (index 16), is_illegal=$21 (index 20)
      expect(insert[1][12]).toBe(true); // is_raw
      expect(insert[1][16]).toBe(true); // is_harvestable
      expect(insert[1][20]).toBe(true); // is_illegal
    });

    it('skips commodity with no name and emits warn', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
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
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT'),
      );
      expect(insert).toBeUndefined();
    });
  });

  describe('parent_uex_id two-pass', () => {
    it('pass 1a inserts with NULL parent_uex_id; pass 1b issues UPDATE to set it', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      // Parent (id=1) and child (id=2, id_parent=1) both in payload
      uexGet.mockResolvedValueOnce([
        makeCommodity({ id: 1 }),
        makeCommodity({ id: 2, name: 'Agricium Ore', id_parent: 1 }),
      ]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toMatch(/VALUES\s*\(\s*\$1,NULL,/);

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
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
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
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
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
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
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
      mapFind.mockResolvedValueOnce([{ commodityUexId: 1 }]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([makeCommodity({ id_parent: null })]);

      await step.execute(CTX);

      expect(repoSave).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('ON CONFLICT (uex_id) DO UPDATE SET present; parent_uex_id not overwritten on conflict', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_commodity'),
      );
      expect(insert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
      expect(insert[0]).not.toContain('parent_uex_id=EXCLUDED.parent_uex_id');
    });
  });

  describe('commodity category mapping coverage', () => {
    it('does not warn when a commodity has a local category mapping', async () => {
      const dsQuery = buildDsQuery();
      mapFind.mockResolvedValueOnce([{ commodityUexId: 1 }]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([makeCommodity()]);

      await step.execute(CTX);

      expect(repoSave).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'has no local catalog category mapping',
          ),
        }),
      );
    });

    it('warns when a commodity is missing from the local category map', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([
        makeCommodity({ id: 42, name: 'Unmapped' }),
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: 'Commodity uex_id=42 has no local catalog category mapping',
          rawPayload: expect.objectContaining({
            id: 42,
            name: 'Unmapped',
          }),
        }),
      );
    });

    it('warns for every commodity when the local category map is empty', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave, mapFind);
      uexGet.mockResolvedValueOnce([
        makeCommodity({ id: 1, name: 'Agricium' }),
        makeCommodity({ id: 2, name: 'Agricium (Ore)' }),
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Commodity uex_id=1 has no local catalog category mapping',
        }),
      );
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Commodity uex_id=2 has no local catalog category mapping',
        }),
      );
    });
  });
});
