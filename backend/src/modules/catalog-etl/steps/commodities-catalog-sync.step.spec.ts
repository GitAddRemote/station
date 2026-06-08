import { CommoditiesCatalogSyncStep } from './commodities-catalog-sync.step';

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
    uex_id: 1,
    name: 'Agricium',
    slug: 'agricium',
    code: 'AGRI',
    kind: 'Metal',
    weight_scu: '1.0000',
    price_buy: '1250.00',
    price_sell: '1300.00',
    is_available_live: true,
    is_illegal: false,
    is_buyable: true,
    is_sellable: true,
    is_extractable: false,
    is_mineral: false,
    is_raw: false,
    is_pure: false,
    is_refined: false,
    is_refinable: false,
    is_harvestable: false,
    is_volatile_qt: false,
    is_volatile_time: false,
    is_inert: false,
    is_explosive: false,
    is_buggy: false,
    is_fuel: false,
    is_temporary: false,
    wiki: null,
    catalog_category_id: 'cat-metals-uuid',
    ...overrides,
  };
}

function buildDsQuery(
  commodityRows: unknown[] = [],
  locallyManagedRows: unknown[] = [],
): jest.Mock {
  return jest
    .fn()
    .mockResolvedValueOnce(locallyManagedRows)
    .mockResolvedValueOnce(commodityRows)
    .mockResolvedValue([]);
}

function buildStep(
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new CommoditiesCatalogSyncStep(
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('CommoditiesCatalogSyncStep', () => {
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('commodity upsert', () => {
    it('upserts a normal commodity with correct catalog_kind, category_id and slug', async () => {
      const dsQuery = buildDsQuery([makeCommodity()], []);
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeDefined();
      expect(insert[0]).toContain("'commodity'");
      expect(insert[0]).toContain('ON CONFLICT (slug) DO UPDATE SET');
      expect(insert[1][0]).toBe('cat-metals-uuid'); // $1 category_id
      expect(insert[1][1]).toBe(1); // $2 uex_id
      expect(insert[1][2]).toBe('Agricium'); // $3 name
      expect(insert[1][3]).toBe('agricium'); // $4 slug
      expect(insert[1][4]).toBe(true); // $5 is_available_live
      expect(insert[1][5]).toBe(false); // $6 is_illegal
    });

    it('generates slug as commodity-{uex_id} when slug is null', async () => {
      const dsQuery = buildDsQuery(
        [makeCommodity({ slug: null, uex_id: 99 })],
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][3]).toBe('commodity-99');
    });

    it('stores weight_scu as scu param', async () => {
      const dsQuery = buildDsQuery(
        [makeCommodity({ weight_scu: '2.5000' })],
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][6]).toBe('2.5000'); // $7 scu
    });
  });

  describe('missing category mapping', () => {
    it('emits warn and skips when catalog_category_id is null', async () => {
      const dsQuery = buildDsQuery(
        [makeCommodity({ catalog_category_id: null })],
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('has no catalog category mapping'),
        }),
      );
    });
  });

  describe('locally managed drift detection', () => {
    it('silently skips when locally managed and no drift', async () => {
      const dsQuery = buildDsQuery(
        [makeCommodity()],
        [
          {
            uex_id: 1,
            name: 'Agricium',
            slug: 'agricium',
            is_available_live: true,
            is_illegal: false,
          },
        ],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeUndefined();
      expect(repoSave).not.toHaveBeenCalled();
    });

    it('warns with drifted_fields when locally managed and upstream data has drifted', async () => {
      const dsQuery = buildDsQuery(
        [makeCommodity({ name: 'Agricium Updated' })],
        [
          {
            uex_id: 1,
            name: 'Agricium',
            slug: 'agricium',
            is_available_live: true,
            is_illegal: false,
          },
        ],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          rawPayload: expect.objectContaining({
            id: 1,
            drifted_fields: expect.arrayContaining(['name']),
          }),
        }),
      );
    });

    it('warns via slug fallback when locally managed row has uex_id=null but matching slug', async () => {
      const dsQuery = buildDsQuery(
        [makeCommodity()],
        [
          {
            uex_id: null,
            name: 'Agricium',
            slug: 'agricium',
            is_available_live: true,
            is_illegal: false,
          },
        ],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          rawPayload: expect.objectContaining({
            id: 1,
            drifted_fields: expect.arrayContaining(['uex_id']),
          }),
        }),
      );
    });
  });
});
