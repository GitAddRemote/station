import { ItemsCatalogSyncStep } from './items-catalog-sync.step';

const CTX = { runId: 'test-run-id' };

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    uex_id: 1,
    name: 'Helmets S1',
    slug: 'helmets-s1',
    size: '1',
    weight_scu: '0.5000',
    is_buyable: true,
    is_sellable: false,
    company_name: 'ArcCorp',
    category_name: null,
    uuid: 'some-uuid-value',
    catalog_category_id: 'cat-helmets-uuid',
    ...overrides,
  };
}

function buildDsQuery(
  itemRows: unknown[] = [],
  locallyManagedRows: unknown[] = [],
): jest.Mock {
  return jest
    .fn()
    .mockResolvedValueOnce(locallyManagedRows)
    .mockResolvedValueOnce(itemRows)
    .mockResolvedValue([]);
}

function buildStep(
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new ItemsCatalogSyncStep(
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('ItemsCatalogSyncStep', () => {
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('item upsert', () => {
    it('upserts a normal item with correct catalog_kind, category_id and slug', async () => {
      const dsQuery = buildDsQuery([makeItem()], []);
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeDefined();
      expect(insert[0]).toContain("'item'");
      expect(insert[0]).toContain('ON CONFLICT (slug) DO UPDATE SET');
      expect(insert[1][0]).toBe('cat-helmets-uuid'); // $1 category_id
      expect(insert[1][1]).toBe(1); // $2 uex_id
      expect(insert[1][2]).toBe('Helmets S1'); // $3 name
      expect(insert[1][3]).toBe('helmets-s1'); // $4 slug
    });

    it('parses varchar size to smallint', async () => {
      const dsQuery = buildDsQuery([makeItem({ size: '3' })], []);
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][4]).toBe(3); // $5 size
    });

    it('stores NULL for size when not parseable', async () => {
      const dsQuery = buildDsQuery([makeItem({ size: 'N/A' })], []);
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][4]).toBeNull(); // $5 size
    });

    it('generates slug as item-{uex_id} when slug is null', async () => {
      const dsQuery = buildDsQuery([makeItem({ slug: null, uex_id: 55 })], []);
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][3]).toBe('item-55');
    });
  });

  describe('missing category mapping', () => {
    it('emits warn and skips when catalog_category_id is null', async () => {
      const dsQuery = buildDsQuery(
        [makeItem({ catalog_category_id: null })],
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
        [makeItem()],
        [
          {
            uex_id: 1,
            name: 'Helmets S1',
            slug: 'helmets-s1',
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
        [makeItem({ name: 'Helmets S1 Updated' })],
        [
          {
            uex_id: 1,
            name: 'Helmets S1',
            slug: 'helmets-s1',
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
        [makeItem()],
        [
          {
            uex_id: null,
            name: 'Helmets S1',
            slug: 'helmets-s1',
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
