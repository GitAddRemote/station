import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';

interface StationVehicleRow {
  uex_id: number;
  name: string;
  slug: string | null;
  scu: string | null;
  crew_min: number | null;
  crew_max: number | null;
  mass: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  fuel_quantum: string | null;
  fuel_hydrogen: string | null;
  is_concept: boolean;
  is_ground_vehicle: boolean;
  is_addon: boolean;
  is_spaceship: boolean;
  is_starter: boolean;
  is_civilian: boolean;
  is_military: boolean;
  is_exploration: boolean;
  is_cargo: boolean;
  is_mining: boolean;
  is_salvage: boolean;
  is_medical: boolean;
  is_racing: boolean;
  is_stealth: boolean;
  is_industrial: boolean;
  is_passenger: boolean;
  url_photo: string | null;
  url_store: string | null;
  url_brochure: string | null;
  url_hotsite: string | null;
  url_video: string | null;
  game_version: string | null;
  pad_type: string | null;
  is_boarding: boolean;
  is_bomber: boolean;
  is_carrier: boolean;
  is_construction: boolean;
  is_datarunner: boolean;
  is_docking: boolean;
  is_emp: boolean;
  is_hangar: boolean;
  is_interdiction: boolean;
  is_loading_dock: boolean;
  is_qed: boolean;
  is_refinery: boolean;
  is_refuel: boolean;
  is_repair: boolean;
  is_research: boolean;
  is_scanning: boolean;
  is_science: boolean;
  is_showdown_winner: boolean;
  is_tractor_beam: boolean;
  is_quantum_capable: boolean;
}

interface StoredCatalogEntry {
  uex_id: number;
  category_id: string;
  name: string;
  slug: string;
  scu: string | null;
  crew_min: number | null;
  crew_max: number | null;
  mass: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  is_concept: boolean | null;
}

@Injectable()
export class VehiclesCatalogSyncStep implements EtlStep {
  readonly name = 'vehicles-catalog-sync';

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(VehiclesCatalogSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    // Preload fallback category IDs by slug
    const categoryRows = await this.dataSource.query<
      { id: string; slug: string }[]
    >(
      `SELECT id, slug FROM station_catalog_category WHERE slug IN ($1, $2, $3)`,
      ['ground-vehicle', 'addon-module', 'ship'],
    );
    const categoryBySlug = new Map(categoryRows.map((r) => [r.slug, r.id]));

    const groundVehicleCategoryId =
      categoryBySlug.get('ground-vehicle') ?? null;
    const addonModuleCategoryId = categoryBySlug.get('addon-module') ?? null;
    const shipCategoryId = categoryBySlug.get('ship') ?? null;

    // Load locally managed catalog entries for drift detection
    const locallyManagedRows = await this.dataSource.query<
      StoredCatalogEntry[]
    >(
      `SELECT uex_id, category_id, name, slug, scu, crew_min, crew_max, mass, length, width, height, is_concept
       FROM station_catalog_entry
       WHERE is_locally_managed = TRUE AND catalog_kind = 'vehicle'`,
    );
    const locallyManagedByUexId = new Map<number, StoredCatalogEntry>(
      locallyManagedRows.map((r) => [r.uex_id, r]),
    );

    // Load all vehicles from station_vehicle
    const vehicles = await this.dataSource.query<StationVehicleRow[]>(
      `SELECT uex_id, name, slug, scu, crew_min, crew_max, mass, length, width, height,
              fuel_quantum, fuel_hydrogen, is_concept,
              is_ground_vehicle, is_addon, is_spaceship,
              is_starter, is_civilian, is_military, is_exploration, is_cargo,
              is_mining, is_salvage, is_medical, is_racing, is_stealth,
              is_industrial, is_passenger,
              url_photo, url_store, url_brochure, url_hotsite, url_video,
              game_version, pad_type,
              is_boarding, is_bomber, is_carrier, is_construction, is_datarunner,
              is_docking, is_emp, is_hangar, is_interdiction, is_loading_dock,
              is_qed, is_refinery, is_refuel, is_repair, is_research,
              is_scanning, is_science, is_showdown_winner, is_tractor_beam,
              is_quantum_capable
       FROM station_vehicle`,
    );

    this.logger.info(
      { runId: ctx.runId, count: vehicles.length },
      'Loaded vehicles from station_vehicle',
    );

    let upserted = 0;
    let skipped = 0;

    for (const record of vehicles) {
      // Determine category_id based on role flags
      let categoryId: string | null;
      if (record.is_ground_vehicle) {
        categoryId = groundVehicleCategoryId;
      } else if (record.is_addon) {
        categoryId = addonModuleCategoryId;
      } else {
        categoryId = shipCategoryId;
      }

      if (!categoryId) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Vehicle uex_id=${record.uex_id} has no resolvable catalog category — skipped`,
            rawPayload: { id: record.uex_id },
          }),
        );
        skipped++;
        continue;
      }

      // Check locally managed drift
      const stored = locallyManagedByUexId.get(record.uex_id);
      if (stored !== undefined) {
        const drifted: string[] = [];
        if (categoryId !== stored.category_id) drifted.push('category_id');
        if (record.name !== stored.name) drifted.push('name');
        const slug = record.slug ?? `vehicle-${record.uex_id}`;
        if (slug !== stored.slug) drifted.push('slug');
        if ((record.scu ?? null) !== stored.scu) drifted.push('scu');
        if ((record.crew_min ?? null) !== stored.crew_min)
          drifted.push('crew_min');
        if ((record.crew_max ?? null) !== stored.crew_max)
          drifted.push('crew_max');
        if ((record.mass ?? null) !== stored.mass) drifted.push('mass');
        if ((record.length ?? null) !== stored.length) drifted.push('length');
        if ((record.width ?? null) !== stored.width) drifted.push('width');
        if ((record.height ?? null) !== stored.height) drifted.push('height');
        if (record.is_concept !== stored.is_concept) drifted.push('is_concept');

        if (drifted.length > 0) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Vehicle uex_id=${record.uex_id} is locally managed but upstream data has drifted — ETL skipped`,
              rawPayload: { id: record.uex_id, drifted_fields: drifted },
            }),
          );
        }
        continue;
      }

      const slug = record.slug ?? `vehicle-${record.uex_id}`;
      const isAvailableLive = !record.is_concept;
      const isConcept = record.is_concept;

      const baseProperties = {
        scu: record.scu ?? null,
        crew_min: record.crew_min ?? null,
        crew_max: record.crew_max ?? null,
        mass: record.mass ?? null,
        length: record.length ?? null,
        width: record.width ?? null,
        height: record.height ?? null,
        fuel_quantum: record.fuel_quantum ?? null,
        fuel_hydrogen: record.fuel_hydrogen ?? null,
      };

      const attributes = {
        url_photo: record.url_photo ?? null,
        url_store: record.url_store ?? null,
        url_brochure: record.url_brochure ?? null,
        url_hotsite: record.url_hotsite ?? null,
        url_video: record.url_video ?? null,
        game_version: record.game_version ?? null,
        pad_type: record.pad_type ?? null,
        is_spaceship: record.is_spaceship,
        is_ground_vehicle: record.is_ground_vehicle,
        is_addon: record.is_addon,
        is_starter: record.is_starter,
        is_civilian: record.is_civilian,
        is_military: record.is_military,
        is_exploration: record.is_exploration,
        is_cargo: record.is_cargo,
        is_mining: record.is_mining,
        is_salvage: record.is_salvage,
        is_medical: record.is_medical,
        is_racing: record.is_racing,
        is_stealth: record.is_stealth,
        is_industrial: record.is_industrial,
        is_passenger: record.is_passenger,
        is_concept: record.is_concept,
      };

      await this.dataSource.query(
        `INSERT INTO station_catalog_entry (
           category_id, catalog_kind, uex_id, name, slug,
           is_available_live, is_illegal, is_concept,
           size, scu, crew_min, crew_max,
           mass, length, width, height,
           is_locally_managed, base_properties, attributes,
           created_at, updated_at
         )
         VALUES (
           $1, 'vehicle', $2, $3, $4,
           $5, NULL, $6,
           NULL, $7, $8, $9,
           $10, $11, $12, $13,
           FALSE, $14, $15,
           NOW(), NOW()
         )
         ON CONFLICT (slug) DO UPDATE SET
           category_id=EXCLUDED.category_id,
           uex_id=EXCLUDED.uex_id,
           name=EXCLUDED.name,
           is_available_live=EXCLUDED.is_available_live,
           is_concept=EXCLUDED.is_concept,
           scu=EXCLUDED.scu,
           crew_min=EXCLUDED.crew_min,
           crew_max=EXCLUDED.crew_max,
           mass=EXCLUDED.mass,
           length=EXCLUDED.length,
           width=EXCLUDED.width,
           height=EXCLUDED.height,
           base_properties=EXCLUDED.base_properties,
           attributes=EXCLUDED.attributes,
           updated_at=NOW()
         WHERE station_catalog_entry.is_locally_managed = FALSE`,
        [
          categoryId, // $1  category_id
          record.uex_id, // $2  uex_id
          record.name, // $3  name
          slug, // $4  slug
          isAvailableLive, // $5  is_available_live
          isConcept, // $6  is_concept
          record.scu ?? null, // $7  scu
          record.crew_min ?? null, // $8  crew_min
          record.crew_max ?? null, // $9  crew_max
          record.mass ?? null, // $10 mass
          record.length ?? null, // $11 length
          record.width ?? null, // $12 width
          record.height ?? null, // $13 height
          JSON.stringify(baseProperties), // $14 base_properties
          JSON.stringify(attributes), // $15 attributes
        ],
      );
      upserted++;
    }

    this.logger.info(
      { runId: ctx.runId, upserted, skipped },
      'vehicles-catalog-sync step complete',
    );
  }
}
