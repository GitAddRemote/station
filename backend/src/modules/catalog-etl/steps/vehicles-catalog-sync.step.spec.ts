import { VehiclesCatalogSyncStep } from './vehicles-catalog-sync.step';

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
    uex_id: 1,
    name: 'Avenger Titan',
    slug: 'avenger-titan',
    scu: '8.0000',
    crew_min: 1,
    crew_max: 1,
    mass: '25000.00',
    length: '24.50',
    width: '18.00',
    height: '6.00',
    fuel_quantum: '100',
    fuel_hydrogen: '200',
    is_concept: false,
    is_ground_vehicle: false,
    is_addon: false,
    is_spaceship: true,
    is_starter: false,
    is_civilian: true,
    is_military: false,
    is_exploration: false,
    is_cargo: false,
    is_mining: false,
    is_salvage: false,
    is_medical: false,
    is_racing: false,
    is_stealth: false,
    is_industrial: false,
    is_passenger: false,
    url_photo: null,
    url_store: null,
    url_brochure: null,
    url_hotsite: null,
    url_video: null,
    game_version: '3.22',
    pad_type: 'S',
    is_boarding: false,
    is_bomber: false,
    is_carrier: false,
    is_construction: false,
    is_datarunner: false,
    is_docking: false,
    is_emp: false,
    is_hangar: false,
    is_interdiction: false,
    is_loading_dock: false,
    is_qed: false,
    is_refinery: false,
    is_refuel: false,
    is_repair: false,
    is_research: false,
    is_scanning: false,
    is_science: false,
    is_showdown_winner: false,
    is_tractor_beam: false,
    is_quantum_capable: true,
    ...overrides,
  };
}

function buildDsQuery(
  vehicleRows: unknown[] = [],
  categoryRows: unknown[] = [],
  locallyManagedRows: unknown[] = [],
): jest.Mock {
  return jest
    .fn()
    .mockResolvedValueOnce(categoryRows)
    .mockResolvedValueOnce(locallyManagedRows)
    .mockResolvedValueOnce(vehicleRows)
    .mockResolvedValue([]);
}

function buildStep(
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new VehiclesCatalogSyncStep(
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('VehiclesCatalogSyncStep', () => {
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    repoCreate = jest.fn().mockImplementation((dto) => dto);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('vehicle upsert', () => {
    it('upserts a normal vehicle with correct catalog_kind and category_id', async () => {
      const shipCategoryId = 'cat-ship-uuid';
      const dsQuery = buildDsQuery(
        [makeVehicle()],
        [
          { id: 'cat-ground-uuid', slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: shipCategoryId, slug: 'ship' },
        ],
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeDefined();
      expect(insert[0]).toContain("'vehicle'");
      expect(insert[0]).toContain('ON CONFLICT (slug) DO UPDATE SET');
      expect(insert[1][0]).toBe(shipCategoryId); // $1 category_id
      expect(insert[1][1]).toBe(1); // $2 uex_id
      expect(insert[1][2]).toBe('Avenger Titan'); // $3 name
      expect(insert[1][3]).toBe('avenger-titan'); // $4 slug
    });

    it('resolves ground-vehicle category for is_ground_vehicle=true', async () => {
      const groundCategoryId = 'cat-ground-uuid';
      const dsQuery = buildDsQuery(
        [makeVehicle({ is_ground_vehicle: true, is_spaceship: false })],
        [
          { id: groundCategoryId, slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: 'cat-ship-uuid', slug: 'ship' },
        ],
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][0]).toBe(groundCategoryId);
    });

    it('generates slug as vehicle-{uex_id} when slug is null', async () => {
      const dsQuery = buildDsQuery(
        [makeVehicle({ slug: null, uex_id: 42 })],
        [
          { id: 'cat-ground-uuid', slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: 'cat-ship-uuid', slug: 'ship' },
        ],
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][3]).toBe('vehicle-42');
    });

    it('sets is_available_live=false and is_concept=true for concept vehicles', async () => {
      const dsQuery = buildDsQuery(
        [makeVehicle({ is_concept: true })],
        [
          { id: 'cat-ground-uuid', slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: 'cat-ship-uuid', slug: 'ship' },
        ],
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert[1][4]).toBe(false); // $5 is_available_live = !is_concept
      expect(insert[1][5]).toBe(true); // $6 is_concept
    });
  });

  describe('missing category mapping', () => {
    it('emits warn and skips when no category can be resolved', async () => {
      // Return empty category rows so all category lookups fail
      const dsQuery = buildDsQuery(
        [makeVehicle()],
        [], // no categories returned
        [],
      );
      const step = buildStep(dsQuery, repoCreate, repoSave);

      await step.execute(CTX);

      const insert = dsQuery.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO station_catalog_entry'),
      );
      expect(insert).toBeUndefined();
      expect(repoSave).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });
  });

  describe('locally managed drift detection', () => {
    it('silently skips when locally managed and no drift', async () => {
      const dsQuery = buildDsQuery(
        [makeVehicle()],
        [
          { id: 'cat-ground-uuid', slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: 'cat-ship-uuid', slug: 'ship' },
        ],
        [
          {
            uex_id: 1,
            category_id: 'cat-ship-uuid',
            name: 'Avenger Titan',
            slug: 'avenger-titan',
            scu: '8.0000',
            crew_min: 1,
            crew_max: 1,
            mass: '25000.00',
            length: '24.50',
            width: '18.00',
            height: '6.00',
            is_concept: false,
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
        [makeVehicle({ name: 'Avenger Titan Renegade' })],
        [
          { id: 'cat-ground-uuid', slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: 'cat-ship-uuid', slug: 'ship' },
        ],
        [
          {
            uex_id: 1,
            category_id: 'cat-ship-uuid',
            name: 'Avenger Titan',
            slug: 'avenger-titan',
            scu: '8.0000',
            crew_min: 1,
            crew_max: 1,
            mass: '25000.00',
            length: '24.50',
            width: '18.00',
            height: '6.00',
            is_concept: false,
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

    it('warns with category_id in drifted_fields when upstream reclassifies ship → ground vehicle', async () => {
      // Stored row has ship category; upstream now has is_ground_vehicle=true
      const dsQuery = buildDsQuery(
        [makeVehicle({ is_ground_vehicle: true, is_spaceship: false })],
        [
          { id: 'cat-ground-uuid', slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: 'cat-ship-uuid', slug: 'ship' },
        ],
        [
          {
            uex_id: 1,
            category_id: 'cat-ship-uuid',
            name: 'Avenger Titan',
            slug: 'avenger-titan',
            scu: '8.0000',
            crew_min: 1,
            crew_max: 1,
            mass: '25000.00',
            length: '24.50',
            width: '18.00',
            height: '6.00',
            is_concept: false,
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
            drifted_fields: expect.arrayContaining(['category_id']),
          }),
        }),
      );
    });

    it('warns via slug fallback when locally managed row has uex_id=null but matching slug', async () => {
      // Locally managed row has no uex_id (null) but shares the slug — must be
      // detected via the slug map and warned with uex_id in drifted_fields.
      const dsQuery = buildDsQuery(
        [makeVehicle()],
        [
          { id: 'cat-ground-uuid', slug: 'ground-vehicle' },
          { id: 'cat-addon-uuid', slug: 'addon-module' },
          { id: 'cat-ship-uuid', slug: 'ship' },
        ],
        [
          {
            uex_id: null,
            category_id: 'cat-ship-uuid',
            name: 'Avenger Titan',
            slug: 'avenger-titan',
            scu: '8.0000',
            crew_min: 1,
            crew_max: 1,
            mass: '25000.00',
            length: '24.50',
            width: '18.00',
            height: '6.00',
            is_concept: false,
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
