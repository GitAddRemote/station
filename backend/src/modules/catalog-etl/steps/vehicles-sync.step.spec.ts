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
    career: 'Combat',
    role: 'Fighter',
    size: 'S',
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
    game_version: '3.22',
    date_added: 1700000000,
    date_modified: 1710000000,
    ...overrides,
  };
}

function makeLoaner(overrides: Record<string, unknown> = {}) {
  return { id_vehicle: 1, id_loaner: 2, ...overrides };
}

function buildDsQuery(): jest.Mock {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('COUNT(*)')) return Promise.resolve([{ c: '2' }]);
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
    it('parses single-value crew "1" → min=1 max=1', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeVehicle({ crew: '1' }), []]);
      // first call vehicles, second call loaners
      uexGet
        .mockResolvedValueOnce([makeVehicle({ crew: '1' })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][8]).toBe(1); // crew_min ($9)
      expect(vehicleInsert[1][9]).toBe(1); // crew_max ($10)
      expect(vehicleInsert[1][7]).toBe('1'); // crew_raw ($8)
    });

    it('parses range crew "1-4" → min=1 max=4', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ crew: '1-4' })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][8]).toBe(1); // crew_min
      expect(vehicleInsert[1][9]).toBe(4); // crew_max
      expect(vehicleInsert[1][7]).toBe('1-4'); // crew_raw
    });

    it('crew "N/A" → min=null max=null, crew_raw preserved', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ crew: 'N/A' })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][7]).toBe('N/A'); // crew_raw
      expect(vehicleInsert[1][8]).toBeNull(); // crew_min
      expect(vehicleInsert[1][9]).toBeNull(); // crew_max
    });

    it('null crew → min=null max=null, crew_raw=null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ crew: null })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][7]).toBeNull(); // crew_raw
      expect(vehicleInsert[1][8]).toBeNull(); // crew_min
      expect(vehicleInsert[1][9]).toBeNull(); // crew_max
    });
  });

  describe('sc_uuid storage', () => {
    it('stores uuid field as $2 (uuid column)', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ uuid: 'abc-def-123' })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][1]).toBe('abc-def-123'); // uuid ($2)
    });

    it('null uuid stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ uuid: null })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][1]).toBeNull();
    });
  });

  describe('company FK', () => {
    it('stores id_company directly as company_uex_id ($3)', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ id_company: 42 })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][2]).toBe(42); // company_uex_id ($3)
    });

    it('null id_company stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ id_company: null })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][2]).toBeNull();
    });
  });

  describe('pad_type validation', () => {
    it('stores valid pad_type uppercased', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ pad_type: 'xl' })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][21]).toBe('XL'); // pad_type ($22)
    });

    it('invalid pad_type stored as null', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ pad_type: 'GIANT' })])
        .mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[1][21]).toBeNull();
    });
  });

  describe('vehicle loaners two-pass', () => {
    it('upserts loaners after vehicles using uex_ids', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([
          makeVehicle({ id: 1 }),
          makeVehicle({ id: 2, name: 'Titan 2' }),
        ])
        .mockResolvedValueOnce([makeLoaner({ id_vehicle: 1, id_loaner: 2 })]);

      await step.execute(CTX);

      const loanerInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInsert).toBeDefined();
      expect(loanerInsert[1]).toEqual([1, 2]);
    });

    it('skips loaner when one side is unknown and emits warn', async () => {
      const dsQuery = jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return Promise.resolve([{ c: '1' }]); // only 1 of 2 found
        return Promise.resolve([]);
      });
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ id: 1 })])
        .mockResolvedValueOnce([makeLoaner({ id_vehicle: 1, id_loaner: 999 })]);

      await step.execute(CTX);

      const loanerInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInsert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });

    it('vehicle upserts happen before loaner inserts', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ id: 1 })])
        .mockResolvedValueOnce([makeLoaner()]);

      await step.execute(CTX);

      const calls = dsQuery.mock.calls.map(
        ([sql]: [string]) =>
          sql.trim().split(/\s+/)[0] + ' ' + sql.trim().split(/\s+/)[2],
      );
      const vehicleIdx = calls.findIndex(
        (s) =>
          s.includes('station_vehicle') &&
          !s.includes('loaner') &&
          !s.includes('COUNT'),
      );
      const loanerIdx = calls.findIndex((s) =>
        s.includes('station_vehicle_loaner'),
      );
      expect(vehicleIdx).toBeGreaterThanOrEqual(0);
      expect(loanerIdx).toBeGreaterThan(vehicleIdx);
    });

    it('no loaners → no loaner inserts', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValueOnce([makeVehicle()]).mockResolvedValueOnce([]);

      await step.execute(CTX);

      const loanerInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle_loaner'),
      );
      expect(loanerInsert).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('skips vehicle with no name and emits warn', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet
        .mockResolvedValueOnce([makeVehicle({ name: '' })])
        .mockResolvedValueOnce([]);

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
      uexGet.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await step.execute(CTX);

      const anyInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT'),
      );
      expect(anyInsert).toBeUndefined();
    });

    it('is idempotent — ON CONFLICT DO UPDATE target is uex_id', async () => {
      const dsQuery = buildDsQuery();
      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      uexGet.mockResolvedValue([makeVehicle()]);
      uexGet.mockResolvedValueOnce([makeVehicle()]).mockResolvedValueOnce([]);

      await step.execute(CTX);

      const vehicleInsert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_vehicle'),
      );
      expect(vehicleInsert[0]).toContain('ON CONFLICT (uex_id) DO UPDATE SET');
    });
  });
});
