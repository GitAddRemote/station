import { VehiclesSyncStep } from './vehicles-sync.step';

const CTX = { runId: 'test-run-id' };

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeVehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'sc-uuid-1234',
    id_company: 10,
    id_parent: null,
    name: 'Avenger Titan',
    name_full: 'Aegis Avenger Titan',
    slug: 'avenger-titan',
    crew: '1',
    mass: 45000,
    width: 18,
    height: 5,
    length: 22,
    scu: 8,
    fuel_quantum: 1000,
    fuel_hydrogen: 500,
    container_sizes: null,
    pad_type: 'S',
    is_addon: 0,
    is_boarding: 0,
    is_bomber: 0,
    is_cargo: 0,
    is_carrier: 0,
    is_civilian: 1,
    is_concept: 0,
    is_construction: 0,
    is_datarunner: 0,
    is_docking: 0,
    is_emp: 0,
    is_exploration: 0,
    is_ground_vehicle: 0,
    is_hangar: 0,
    is_industrial: 0,
    is_interdiction: 0,
    is_loading_dock: 0,
    is_medical: 0,
    is_military: 1,
    is_mining: 0,
    is_passenger: 0,
    is_qed: 0,
    is_racing: 0,
    is_refinery: 0,
    is_refuel: 0,
    is_repair: 0,
    is_research: 0,
    is_salvage: 0,
    is_scanning: 0,
    is_science: 0,
    is_showdown_winner: 0,
    is_spaceship: 1,
    is_starter: 0,
    is_stealth: 0,
    is_tractor_beam: 0,
    is_quantum_capable: 1,
    url_photo: null,
    url_store: null,
    url_brochure: null,
    url_hotsite: null,
    url_video: null,
    ids_vehicles_loaners: null,
    loaners: null,
    game_version: '3.22',
    date_added: 1700000000,
    date_modified: 1710000000,
    ...overrides,
  };
}

// By default returns known company uex_id=10 (matches makeVehicle default id_company).
// Returns [] for all other queries (INSERT, UPDATE, DELETE).
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
  return new VehiclesSyncStep(
    { get: uexGet } as never,
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('VehiclesSyncStep', () => {
  let uexGet: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('crew parsing', () => {
    // param layout (parent_uex_id is a NULL literal, not a placeholder):
    // $1=uex_id $2=uuid $3=company_uex_id $4=name $5=name_full $6=slug
    // $7=crew_raw $8=crew_min $9=crew_max  → array indices [6],[7],[8]

    it('parses single-value crew "1" → min=1 max=1', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ crew: '1' })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][6]).toBe('1'); // crew_raw  ($7)
      expect(vehicleInsert[1][7]).toBe(1); // crew_min  ($8)
      expect(vehicleInsert[1][8]).toBe(1); // crew_max  ($9)
    });

    it('parses range crew "1-4" → min=1 max=4', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ crew: '1-4' })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][6]).toBe('1-4'); // crew_raw
      expect(vehicleInsert[1][7]).toBe(1); // crew_min
      expect(vehicleInsert[1][8]).toBe(4); // crew_max
    });

    it('crew "N/A" → min=null max=null, crew_raw preserved', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ crew: 'N/A' })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][6]).toBe('N/A'); // crew_raw
      expect(vehicleInsert[1][7]).toBeNull(); // crew_min
      expect(vehicleInsert[1][8]).toBeNull(); // crew_max
    });

    it('null crew → all three columns null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ crew: null })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][6]).toBeNull(); // crew_raw
      expect(vehicleInsert[1][7]).toBeNull(); // crew_min
      expect(vehicleInsert[1][8]).toBeNull(); // crew_max
    });
  });

  describe('uuid storage', () => {
    it('stores uuid field as $2 (uuid column, index [1])', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ uuid: 'abc-def-123' })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][1]).toBe('abc-def-123');
    });

    it('null uuid stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ uuid: null })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][1]).toBeNull();
    });
  });

  describe('company FK', () => {
    it('stores known id_company as company_uex_id ($3, index [2])', async () => {
      const dsQuery = buildDsQuery([42]);
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ id_company: 42 })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][2]).toBe(42);
    });

    it('null id_company stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ id_company: null })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][2]).toBeNull();
    });

    it('unknown id_company coerced to null and emits warn', async () => {
      const dsQuery = buildDsQuery([]); // no known companies
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ id_company: 99 })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][2]).toBeNull();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          message: expect.stringContaining('unknown company uex_id=99'),
        }),
      );
    });
  });

  describe('pad_type validation', () => {
    // pad_type is $18 (index [17]): career/role/size are not schema columns
    // and have been removed, shifting pad_type from $21 to $18.

    it('stores valid pad_type uppercased', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ pad_type: 'xl' })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][17]).toBe('XL'); // pad_type ($18)
    });

    it('invalid pad_type stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ pad_type: 'GIANT' })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][17]).toBeNull();
    });
  });

  describe('container_sizes normalization', () => {
    it('passes through numeric container_sizes arrays unchanged', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ container_sizes: [1, 2] })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][16]).toEqual([1, 2]); // $17 container_sizes
    });

    it('parses comma-delimited string container_sizes into integer arrays', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ container_sizes: '1,2, 4' }),
      ]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][16]).toEqual([1, 2, 4]); // $17 container_sizes
    });

    it('stores null when string container_sizes cannot be parsed into positive integers', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ container_sizes: 'abc,0,-1' }),
      ]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][16]).toBeNull(); // $17 container_sizes
    });
  });

  describe('parent_uex_id two-pass', () => {
    it('pass 1a inserts with NULL parent_uex_id; pass 1b issues UPDATE to set it', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Both parent (id=1) and child (id=2) are in the payload
      uexGet.mockResolvedValueOnce([
        makeVehicle({ id: 1 }),
        makeVehicle({ id: 2, name: 'Child Ship', id_parent: 1 }),
      ]);

      await step.execute(CTX);

      const insertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      // parent_uex_id is a NULL literal in VALUES — no placeholder for it
      expect(insertCall[0]).toMatch(/VALUES\s*\(\s*\$1,\$2,\$3,NULL/);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_vehicle') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toEqual([1, 2]); // [id_parent, uex_id]
    });

    it('skips UPDATE and emits warn when id_parent references an unknown uex_id', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Vehicle 2 references parent 999 which is not in the current payload
      uexGet.mockResolvedValueOnce([makeVehicle({ id: 2, id_parent: 999 })]);

      await step.execute(CTX);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_vehicle') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('no UPDATE issued for vehicles without a parent', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ id: 1, id_parent: null })]);

      await step.execute(CTX);

      const updateCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_vehicle') &&
          sql.includes('parent_uex_id = $1'),
      );
      expect(updateCall).toBeUndefined();
    });

    it('pass 1c clears parent_uex_id for de-parented vehicles', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      // Vehicle has no id_parent — pass 1c should null it out
      uexGet.mockResolvedValueOnce([makeVehicle({ id: 1, id_parent: null })]);

      await step.execute(CTX);

      const clearCall = dsQuery.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE station_vehicle') &&
          sql.includes('parent_uex_id = NULL'),
      );
      expect(clearCall).toBeDefined();
      expect(clearCall[1][0]).toContain(1);
    });
  });

  describe('vehicle loaners two-pass', () => {
    it('upserts valid loaners when both sides were upserted in this run', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ id: 1, loaners: [2] }),
        makeVehicle({ id: 2, name: 'Titan 2' }),
      ]);

      await step.execute(CTX);

      const loanerInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInsert).toBeDefined();
      expect(loanerInsert[1]).toEqual([1, 2]);
    });

    it('deletes stale loaner rows for ALL upserted vehicles (not just loaner origins) before re-inserting', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ id: 1, loaners: [2] }),
        makeVehicle({ id: 2, name: 'Titan 2' }),
      ]);

      await step.execute(CTX);

      const deleteCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('DELETE FROM station_vehicle_loaner'),
      );
      expect(deleteCall).toBeDefined();
      // Both upserted vehicle ids must appear in the DELETE scope
      expect(deleteCall[1][0]).toContain(1);
      expect(deleteCall[1][0]).toContain(2);

      // DELETE must happen before INSERT
      const sqls = dsQuery.mock.calls.map(([sql]: [string]) => sql.trim());
      const deleteIdx = sqls.findIndex((s) =>
        s.includes('DELETE FROM station_vehicle_loaner'),
      );
      const insertIdx = sqls.findIndex((s) =>
        s.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(deleteIdx).toBeGreaterThanOrEqual(0);
      expect(insertIdx).toBeGreaterThan(deleteIdx);
    });

    it('DELETE fires for all upserted vehicles even when loaner payload is empty', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ id: 1 })]);

      await step.execute(CTX);

      const deleteCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('DELETE FROM station_vehicle_loaner'),
      );
      expect(deleteCall).toBeDefined();
      // Scoped to all upserted vehicle uex_ids
      expect(deleteCall[1][0]).toContain(1);
    });

    it('skips loaner when one side is absent from the known Set and emits warn', async () => {
      const dsQuery = buildDsQuery(); // uex_id 999 not known
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ id: 1, loaners: [999] })]);

      await step.execute(CTX);

      const loanerInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInsert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('vehicle upserts → DELETE stale → INSERT loaners, in order', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ id: 1, loaners: [2] }),
        makeVehicle({ id: 2, name: 'Titan 2' }),
      ]);

      await step.execute(CTX);

      const sqls = dsQuery.mock.calls.map(([sql]: [string]) => sql.trim());
      const vehicleInsertIdx = sqls.findIndex((s) =>
        s.startsWith('INSERT INTO station_vehicle'),
      );
      const deleteIdx = sqls.findIndex((s) =>
        s.includes('DELETE FROM station_vehicle_loaner'),
      );
      const loanerInsertIdx = sqls.findIndex((s) =>
        s.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(vehicleInsertIdx).toBeGreaterThanOrEqual(0);
      expect(deleteIdx).toBeGreaterThan(vehicleInsertIdx);
      expect(loanerInsertIdx).toBeGreaterThan(deleteIdx);
    });

    it('no loaners → no loaner inserts, but DELETE still fires to clear stale rows', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle()]);

      await step.execute(CTX);

      const loanerInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInsert).toBeUndefined();

      const deleteCall = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('DELETE FROM station_vehicle_loaner'),
      );
      expect(deleteCall).toBeDefined();
    });

    it('ids_vehicles_loaners as number array resolves loaner relationships', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ id: 1, ids_vehicles_loaners: [2], loaners: null }),
        makeVehicle({ id: 2, name: 'Loaner Ship' }),
      ]);

      await step.execute(CTX);

      const loanerInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInsert).toBeDefined();
      expect(loanerInsert[1]).toEqual([1, 2]);
    });

    it('ids_vehicles_loaners as CSV string resolves loaner relationships', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ id: 1, ids_vehicles_loaners: '2,3', loaners: null }),
        makeVehicle({ id: 2, name: 'Loaner A' }),
        makeVehicle({ id: 3, name: 'Loaner B' }),
      ]);

      await step.execute(CTX);

      const loanerInserts = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      const insertedPairs = loanerInserts.map(
        ([, params]: [string, number[]]) => params,
      );
      expect(insertedPairs).toContainEqual([1, 2]);
      expect(insertedPairs).toContainEqual([1, 3]);
    });

    it('ids_vehicles_loaners CSV with invalid entries ignores non-positive values', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({
          id: 1,
          ids_vehicles_loaners: '2, -1, abc, 0',
          loaners: null,
        }),
        makeVehicle({ id: 2, name: 'Loaner A' }),
      ]);

      await step.execute(CTX);

      const loanerInserts = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInserts).toHaveLength(1);
      expect(loanerInserts[0][1]).toEqual([1, 2]);
    });

    it('deduplicates loaners when ids_vehicles_loaners and loaners field overlap', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ id: 1, ids_vehicles_loaners: [2], loaners: [2] }),
        makeVehicle({ id: 2, name: 'Loaner Ship' }),
      ]);

      await step.execute(CTX);

      const loanerInserts = dsQuery.mock.calls.filter(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInserts).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('skips vehicle with no name and emits warn', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle({ name: '' })]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('empty vehicle list produces no inserts', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([]);

      await step.execute(CTX);

      const anyInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT'),
      );
      expect(anyInsert).toBeUndefined();
    });

    it('ON CONFLICT (uex_id) DO UPDATE SET present; parent_uex_id not overwritten on conflict', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle()]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
      // parent_uex_id must NOT be in the DO UPDATE list — pass 1b/1c handle it
      expect(vehicleInsert[0]).not.toContain(
        'parent_uex_id=EXCLUDED.parent_uex_id',
      );
    });

    it('params array has exactly 62 entries matching $1..$62 placeholders', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([
        makeVehicle({ date_added: 1700000000, date_modified: 1710000000 }),
      ]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      // 62 params: $1..$62; synced_at and parent_uex_id are SQL literals
      expect(vehicleInsert[1]).toHaveLength(62);
      // Last two params are the date timestamps ($61, $62)
      expect(vehicleInsert[1][60]).toBeInstanceOf(Date); // uex_date_added
      expect(vehicleInsert[1][61]).toBeInstanceOf(Date); // uex_date_modified
      // VALUES clause ends at $62,NOW() — not $63 or higher
      expect(vehicleInsert[0]).toMatch(/\$62,NOW\(\)/);
    });
  });
});
