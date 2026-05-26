import { CategoriesSyncStep } from './categories-sync.step';

const CTX = { runId: 'test-run-id' };

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Rifles',
    code: 'rifles',
    type: 'item',
    section: 'Weapons',
    is_game_related: 1,
    is_mining: 0,
    date_added: 1700000000,
    date_modified: 1710000000,
    attributes: [],
    ...overrides,
  };
}

function makeAttribute(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    name: 'damage',
    description: 'Damage per shot',
    is_lower_better: 0,
    date_added: 1700000000,
    date_modified: 1710000000,
    ...overrides,
  };
}

// dsQuery mock: RETURNING id for section upserts returns { id: 999 }
function buildDsQuery(sectionId = 999): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('RETURNING id')) {
      return Promise.resolve([{ id: sectionId }]);
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
  return new CategoriesSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('CategoriesSyncStep', () => {
  let uexGet: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('section row creation', () => {
    it('upserts one section row per unique (type, section) pair', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({ id: 1, section: 'Weapons', type: 'item' }),
        makeCategory({
          id: 2,
          name: 'Pistols',
          section: 'Weapons',
          type: 'item',
        }),
        makeCategory({
          id: 3,
          name: 'Ships',
          section: 'Vehicles',
          type: 'item',
        }),
      ]);

      await step.execute(CTX);

      const sectionInserts = dsQuery.mock.calls.filter(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          sql.includes('is_section') &&
          sql.includes('RETURNING id'),
      );
      expect(sectionInserts).toHaveLength(2);
    });

    it('section INSERT uses is_section=TRUE and parent_id=NULL', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory()]);

      await step.execute(CTX);

      const sectionInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          sql.includes('RETURNING id'),
      );
      expect(sectionInsert).toBeDefined();
      // type=$1, section=$2, name=$3
      expect(sectionInsert[1][0]).toBe('item'); // type
      expect(sectionInsert[1][1]).toBe('Weapons'); // section
      expect(sectionInsert[1][2]).toBe('Weapons'); // name = section label
    });

    it("section rows conflict on COALESCE(type, '') to handle NULL type idempotently", async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory()]);

      await step.execute(CTX);

      const sectionInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          sql.includes('RETURNING id'),
      );
      expect(sectionInsert[0]).toContain(
        "ON CONFLICT ((COALESCE(type, '')), name) WHERE is_section = TRUE",
      );
    });

    it('normalizes empty-string section to null — no section row created, leaf parent_id is null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ section: '' })]);

      await step.execute(CTX);

      const sectionInserts = dsQuery.mock.calls.filter(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          sql.includes('RETURNING id'),
      );
      expect(sectionInserts).toHaveLength(0);

      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert[1][1]).toBeNull(); // parent_id = $2
      expect(leafInsert[1][3]).toBeNull(); // section = $4
    });

    it('normalizes whitespace-only section to null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ section: '   ' })]);

      await step.execute(CTX);

      const sectionInserts = dsQuery.mock.calls.filter(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          sql.includes('RETURNING id'),
      );
      expect(sectionInserts).toHaveLength(0);
    });
  });

  describe('leaf row parent FK', () => {
    it('sets parent_id on leaf row to the id returned by section upsert', async () => {
      const dsQuery = buildDsQuery(42);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ id: 1, section: 'Weapons' })]);

      await step.execute(CTX);

      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert).toBeDefined();
      expect(leafInsert[1][1]).toBe(42); // parent_id = $2
    });

    it('sets parent_id to null when category has no section', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ section: null })]);

      await step.execute(CTX);

      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert[1][1]).toBeNull(); // parent_id = $2
    });
  });

  describe('leaf row upsert', () => {
    it('upserts leaf row with uex_id as conflict target', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ id: 5 })]);

      await step.execute(CTX);

      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert).toBeDefined();
      expect(leafInsert[0]).toContain(
        'ON CONFLICT (uex_id) WHERE uex_id IS NOT NULL',
      );
      expect(leafInsert[1][0]).toBe(5); // uex_id = $1
    });

    it('maps is_game_related and is_mining as booleans', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({ is_game_related: 1, is_mining: 0 }),
      ]);

      await step.execute(CTX);

      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert[1][5]).toBe(true); // is_game_related = $6
      expect(leafInsert[1][6]).toBe(false); // is_mining = $7
    });

    it('stores null type when UEX type is unknown', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ type: 'unknown_type' })]);

      await step.execute(CTX);

      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert[1][2]).toBeNull(); // type = $3
    });

    it('emits warning for unknown type but still upserts the row', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ type: 'unknown_type' })]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining("unknown type 'unknown_type'"),
        }),
      );
      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert).toBeDefined();
    });
  });

  describe('attribute upsert', () => {
    it('upserts attributes keyed by uex_id with category_uex_id set', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({
          id: 3,
          attributes: [
            makeAttribute({ id: 10 }),
            makeAttribute({ id: 11, name: 'range' }),
          ],
        }),
      ]);

      await step.execute(CTX);

      const attrInserts = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_category_attribute'),
      );
      expect(attrInserts).toHaveLength(2);
      expect(attrInserts[0][1][0]).toBe(10); // uex_id = $1
      expect(attrInserts[0][1][1]).toBe(3); // category_uex_id = $2
      expect(attrInserts[1][1][0]).toBe(11);
    });

    it('upserts attributes ON CONFLICT (uex_id)', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({ attributes: [makeAttribute()] }),
      ]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_category_attribute'),
      );
      expect(attrInsert[0]).toContain('ON CONFLICT (uex_id)');
    });

    it('maps is_lower_better as boolean', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({ attributes: [makeAttribute({ is_lower_better: 1 })] }),
      ]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_category_attribute'),
      );
      expect(attrInsert[1][4]).toBe(true); // is_lower_better = $5
    });

    it('stores null for is_lower_better when not provided', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({
          attributes: [makeAttribute({ is_lower_better: null })],
        }),
      ]);

      await step.execute(CTX);

      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_category_attribute'),
      );
      expect(attrInsert[1][4]).toBeNull();
    });

    it('skips attribute with missing name and emits warning', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({ attributes: [makeAttribute({ name: '' })] }),
      ]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('attribute'),
        }),
      );
      const attrInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_category_attribute'),
      );
      expect(attrInsert).toBeUndefined();
    });
  });

  describe('idempotency', () => {
    it('produces same section upsert SQL on second run (deterministic conflict target)', async () => {
      const dsQuery1 = buildDsQuery(1);
      const dsQuery2 = buildDsQuery(1);
      const step1 = buildStep(uexGet, dsQuery1, repoCreate, repoSave);
      const step2 = buildStep(
        jest.fn().mockResolvedValue([makeCategory()]),
        dsQuery2,
        repoCreate,
        repoSave,
      );
      uexGet.mockResolvedValue([makeCategory()]);

      await step1.execute(CTX);
      const firstRunSectionSql = dsQuery1.mock.calls
        .filter(([sql]: [string]) => sql.includes('RETURNING id'))
        .map(([sql, params]: [string, unknown[]]) => ({ sql, params }));

      await step2.execute(CTX);
      const secondRunSectionSql = dsQuery2.mock.calls
        .filter(([sql]: [string]) => sql.includes('RETURNING id'))
        .map(([sql, params]: [string, unknown[]]) => ({ sql, params }));

      expect(firstRunSectionSql).toEqual(secondRunSectionSql);
    });

    it('does not duplicate section rows for same section across multiple categories', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({ id: 1, name: 'Rifles', section: 'Weapons' }),
        makeCategory({ id: 2, name: 'Pistols', section: 'Weapons' }),
        makeCategory({ id: 3, name: 'SMGs', section: 'Weapons' }),
      ]);

      await step.execute(CTX);

      const sectionInserts = dsQuery.mock.calls.filter(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          sql.includes('RETURNING id'),
      );
      expect(sectionInserts).toHaveLength(1);
    });
  });

  describe('warnings', () => {
    it('skips category with missing name and emits warning', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeCategory({ name: '' })]);

      await step.execute(CTX);

      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: 'Category missing name',
        }),
      );
      const leafInsert = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInsert).toBeUndefined();
    });

    it('processes valid categories even when some are skipped', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([
        makeCategory({ name: '' }),
        makeCategory({ id: 2, name: 'Rifles' }),
      ]);

      await step.execute(CTX);

      const leafInserts = dsQuery.mock.calls.filter(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO station_category') &&
          !sql.includes('RETURNING id'),
      );
      expect(leafInserts).toHaveLength(1);
      expect(repoSave).toHaveBeenCalledTimes(1);
    });

    it('handles empty categories list without error', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([]);

      await step.execute(CTX);

      const inserts = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_category'),
      );
      expect(inserts).toHaveLength(0);
      expect(repoSave).not.toHaveBeenCalled();
    });
  });
});
