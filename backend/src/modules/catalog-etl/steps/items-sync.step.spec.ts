import { ItemsSyncStep } from './items-sync.step';

const CTX = { runId: 'test-run-id' };

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeAttr(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    id_category: 5,
    id_category_attribute: 42,
    value: '150',
    unit: 'damage',
    date_added: null,
    date_modified: null,
    ...overrides,
  };
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'sc-uuid-item-1',
    id_parent: null,
    id_category: 5,
    id_company: 10,
    id_vehicle: null,
    name: 'Laser Repeater S1',
    slug: 'laser-repeater-s1',
    size: 'S1',
    color: null,
    color2: null,
    quality: null,
    url_store: null,
    is_exclusive_pledge: 0,
    is_exclusive_subscriber: 0,
    is_exclusive_concierge: 0,
    is_commodity: 0,
    is_harvestable: 0,
    screenshot: null,
    notification: null,
    game_version: '3.22',
    date_added: 1700000000,
    date_modified: 1710000000,
    attributes: [makeAttr()],
    ...overrides,
  };
}

function buildDsQuery(
  knownCompanyIds: number[] = [10],
  knownVehicleIds: number[] = [],
  knownCategoryAttrIds: number[] = [42],
): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('SELECT uex_id FROM station_company')) {
      return Promise.resolve(knownCompanyIds.map((id) => ({ uex_id: id })));
    }
    if (sql.includes('SELECT uex_id FROM station_vehicle')) {
      return Promise.resolve(knownVehicleIds.map((id) => ({ uex_id: id })));
    }
    if (sql.includes('SELECT uex_id FROM station_category_attribute')) {
      return Promise.resolve(
        knownCategoryAttrIds.map((id) => ({ uex_id: id })),
      );
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
  return new ItemsSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('ItemsSyncStep', () => {
  let uexGet: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('item upsert', () => {
    it('inserts with parent_uex_id=NULL literal in pass 1a', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem()]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[0]).toMatch(/VALUES\s*\(\s*\$1,NULL/);
    });

    it('has ON CONFLICT (uex_id) DO UPDATE SET; parent_uex_id not overwritten on conflict', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem()]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
      // parent_uex_id must NOT be in the DO UPDATE list — pass 1b/1c handle it
      expect(itemInsert[0]).not.toContain(
        'parent_uex_id=EXCLUDED.parent_uex_id',
      );
    });

    it('params array has exactly 23 entries matching $1..$23', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem()]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1]).toHaveLength(23);
      // Last two are date timestamps ($22, $23)
      expect(itemInsert[1][21]).toBeInstanceOf(Date); // uex_date_added
      expect(itemInsert[1][22]).toBeInstanceOf(Date); // uex_date_modified
      expect(itemInsert[0]).toMatch(/\$23,NOW\(\)/);
    });

    it('stores category_uex_id, company_uex_id, vehicle_uex_id correctly', async () => {
      const dsQuery = buildDsQuery([3], [99]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({ id_category: 7, id_company: 3, id_vehicle: 99 }),
      ]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1][1]).toBe(7); // $2 category_uex_id
      expect(itemInsert[1][2]).toBe(3); // $3 company_uex_id
      expect(itemInsert[1][3]).toBe(99); // $4 vehicle_uex_id
    });

    it('stores uuid at $7 (index [6])', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ uuid: 'my-sc-uuid' })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1][6]).toBe('my-sc-uuid');
    });

    it('null uuid stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ uuid: null })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1][6]).toBeNull();
    });

    it('skips item with no name and emits warn', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ name: '' })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('empty item list produces no inserts', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([]);

      await step.execute(CTX);

      const anyInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT'),
      );
      expect(anyInsert).toBeUndefined();
    });
  });

  describe('company / vehicle FK', () => {
    it('unknown id_company coerced to null and emits warn', async () => {
      const dsQuery = buildDsQuery([]); // no known companies
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ id_company: 99 })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1][2]).toBeNull(); // $3 company_uex_id
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown company uex_id=99'),
        }),
      );
    });

    it('null id_company stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ id_company: null })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1][2]).toBeNull();
    });

    it('unknown id_vehicle coerced to null and emits warn', async () => {
      const dsQuery = buildDsQuery([10], []); // no known vehicles
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ id_vehicle: 55 })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1][3]).toBeNull(); // $4 vehicle_uex_id
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown vehicle uex_id=55'),
        }),
      );
    });

    it('null id_vehicle stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ id_vehicle: null })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(itemInsert[1][3]).toBeNull();
    });
  });

  describe('parent_uex_id two-pass', () => {
    it('pass 1b issues UPDATE to set parent_uex_id when both item and parent are in payload', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Parent (id=1) and child (id=2) both in payload
      uexGet.mockResolvedValueOnce([
        makeItem({ id: 1 }),
        makeItem({ id: 2, name: 'Child Item', id_parent: 1 }),
      ]);

      await step.execute(CTX);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_item') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toEqual([1, 2]); // [id_parent, uex_id]
    });

    it('skips UPDATE and emits warn when id_parent references an unknown uex_id', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Item references parent 999 which is not in the current payload
      uexGet.mockResolvedValueOnce([makeItem({ id: 2, id_parent: 999 })]);

      await step.execute(CTX);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_item') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('no parent UPDATE issued when id_parent is null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ id_parent: null })]);

      await step.execute(CTX);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_item') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeUndefined();
    });

    it('pass 1c clears parent_uex_id for de-parented items', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Item has no id_parent — pass 1c should null it out
      uexGet.mockResolvedValueOnce([makeItem({ id: 1, id_parent: null })]);

      await step.execute(CTX);

      const clearCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_item') &&
          sql.includes('parent_uex_id = NULL'),
      );
      expect(clearCall).toBeDefined();
      expect(clearCall[1][0]).toContain(1);
    });
  });

  describe('attributes_summary JSONB', () => {
    it('builds summary keyed by category_attribute_uex_id with attribute value', async () => {
      const dsQuery = buildDsQuery([10], [], [42, 43]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({
          attributes: [
            makeAttr({ id_category_attribute: 42, value: '150' }),
            makeAttr({ id: 102, id_category_attribute: 43, value: '900' }),
          ],
        }),
      ]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      const summary = JSON.parse(itemInsert[1][19] as string); // $20 attributes_summary
      expect(summary).toEqual({ '42': '150', '43': '900' });
    });

    it('excludes attributes absent from station_category_attribute from summary', async () => {
      const dsQuery = buildDsQuery([10], [], [42]); // only 42 is known; 43 is not
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({
          attributes: [
            makeAttr({ id_category_attribute: 42, value: 'included' }),
            makeAttr({ id: 102, id_category_attribute: 43, value: 'excluded' }),
          ],
        }),
      ]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      const summary = JSON.parse(itemInsert[1][19] as string);
      expect(summary).toEqual({ '42': 'included' });
      expect(summary['43']).toBeUndefined();
    });

    it('produces empty object when item has no attributes', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ attributes: [] })]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      expect(JSON.parse(itemInsert[1][19] as string)).toEqual({});
    });

    it('excludes attributes with falsy id_category_attribute from summary', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({
          attributes: [
            makeAttr({ id_category_attribute: 0, value: 'should-be-excluded' }),
            makeAttr({ id: 102, id_category_attribute: 42, value: 'included' }),
          ],
        }),
      ]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      const summary = JSON.parse(itemInsert[1][19] as string);
      expect(summary).toEqual({ '42': 'included' });
      expect(summary['0']).toBeUndefined();
    });

    it('stores null attribute value as null in summary', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({
          attributes: [makeAttr({ id_category_attribute: 42, value: null })],
        }),
      ]);

      await step.execute(CTX);

      const itemInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item'),
      );
      const summary = JSON.parse(itemInsert[1][19] as string);
      expect(summary['42']).toBeNull();
    });
  });

  describe('item attributes upsert', () => {
    it('upserts each attribute with correct params', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({
          attributes: [
            makeAttr({
              id: 101,
              id_category_attribute: 42,
              value: '150',
              unit: 'dps',
            }),
          ],
        }),
      ]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item_attribute'),
      );
      expect(attrInsert).toBeDefined();
      expect(attrInsert[1][0]).toBe(101); // $1 uex_id
      expect(attrInsert[1][1]).toBe(1); // $2 item_uex_id
      expect(attrInsert[1][3]).toBe(42); // $4 category_attribute_uex_id
      expect(attrInsert[1][4]).toBe('150'); // $5 value
      expect(attrInsert[1][5]).toBe('dps'); // $6 unit
    });

    it('skips attribute with no category_attribute_uex_id and emits warn', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({
          attributes: [makeAttr({ id_category_attribute: 0 })],
        }),
      ]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item_attribute'),
      );
      expect(attrInsert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('skips attribute when id_category_attribute is not in station_category_attribute and emits warn', async () => {
      const dsQuery = buildDsQuery([10], [], []); // no known category attributes
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({ attributes: [makeAttr({ id_category_attribute: 42 })] }),
      ]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item_attribute'),
      );
      expect(attrInsert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining(
            'unknown category_attribute uex_id=42',
          ),
        }),
      );
    });

    it('upserts multiple attributes for a single item', async () => {
      const dsQuery = buildDsQuery([10], [], [42, 43]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeItem({
          attributes: [
            makeAttr({ id: 101, id_category_attribute: 42 }),
            makeAttr({ id: 102, id_category_attribute: 43 }),
          ],
        }),
      ]);

      await step.execute(CTX);

      const attrInserts = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item_attribute'),
      );
      expect(attrInserts).toHaveLength(2);
    });

    it('deletes stale attributes for upserted items before inserting', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ id: 1 })]);

      await step.execute(CTX);

      const deleteCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('DELETE FROM station_item_attribute'),
      );
      expect(deleteCall).toBeDefined();
      expect(deleteCall[1][0]).toContain(1);

      const deleteIdx = dsQuery.mock.calls.findIndex(([sql]: [string]) =>
        sql.includes('DELETE FROM station_item_attribute'),
      );
      const attrInsertIdx = dsQuery.mock.calls.findIndex(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item_attribute'),
      );
      expect(deleteIdx).toBeLessThan(attrInsertIdx);
    });

    it('items with no attributes produce no attribute inserts', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem({ attributes: [] })]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item_attribute'),
      );
      expect(attrInsert).toBeUndefined();
    });

    it('has ON CONFLICT (uex_id) DO UPDATE on attribute insert', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem()]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_item_attribute'),
      );
      expect(attrInsert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
    });
  });

  describe('ordering', () => {
    it('item inserts happen before attribute inserts', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeItem()]);

      await step.execute(CTX);

      const sqls = dsQuery.mock.calls.map(([sql]: [string]) => sql.trim());
      const itemInsertIdx = sqls.findIndex((s) =>
        s.startsWith('INSERT INTO station_item '),
      );
      const attrInsertIdx = sqls.findIndex((s) =>
        s.startsWith('INSERT INTO station_item_attribute'),
      );
      expect(itemInsertIdx).toBeGreaterThanOrEqual(0);
      expect(attrInsertIdx).toBeGreaterThan(itemInsertIdx);
    });
  });
});
