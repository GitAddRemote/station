import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';

interface UexItemRow {
  uex_id: number;
  name: string;
  size: string | null;
  company_name: string | null;
  uuid: string | null;
  catalog_category_id: string | null;
  star_citizen_uuid: string | null;
}

interface StoredCatalogEntry {
  uex_id: number | null;
  name: string;
  slug: string;
}

@Injectable()
export class ItemsCatalogSyncStep implements EtlStep {
  readonly name = 'items-catalog-sync';

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(ItemsCatalogSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    // Load locally managed catalog entries for drift detection
    const locallyManagedRows = await this.dataSource.query<
      StoredCatalogEntry[]
    >(
      `SELECT uex_id, name, slug
       FROM station_catalog_entry
       WHERE is_locally_managed = TRUE AND catalog_kind = 'item'`,
    );
    const locallyManagedByUexId = new Map<number, StoredCatalogEntry>(
      locallyManagedRows
        .filter((r) => r.uex_id !== null)
        .map((r) => [r.uex_id as number, r]),
    );
    const locallyManagedBySlug = new Map<string, StoredCatalogEntry>(
      locallyManagedRows.map((r) => [r.slug, r]),
    );

    // Source from uex_item (populated by the uex-sync pipeline) joined with
    // station_uex_category_map to resolve catalog_category_id.
    const items = await this.dataSource.query<UexItemRow[]>(
      `SELECT ui.uex_id, ui.name, ui.size,
              ui.company_name,
              ui.star_citizen_uuid AS uuid,
              ui.star_citizen_uuid,
              ucm.catalog_category_id
       FROM uex_item ui
       LEFT JOIN station_uex_category_map ucm ON ucm.uex_category_id = ui.id_category
       WHERE ui.deleted = FALSE AND ui.active = TRUE`,
    );

    this.logger.info(
      { runId: ctx.runId, count: items.length },
      'Loaded items from uex_item',
    );

    let upserted = 0;
    let skipped = 0;

    for (const record of items) {
      if (!record.catalog_category_id) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Item uex_id=${record.uex_id} has no catalog category mapping — skipped`,
            rawPayload: { id: record.uex_id },
          }),
        );
        skipped++;
        continue;
      }

      // Check locally managed drift — primary lookup by uex_id, fallback by slug
      const slug = `item-${record.uex_id}`;
      const stored =
        locallyManagedByUexId.get(record.uex_id) ??
        locallyManagedBySlug.get(slug);
      if (stored !== undefined) {
        const drifted: string[] = [];
        if (stored.uex_id !== record.uex_id) drifted.push('uex_id');
        if (record.name !== stored.name) drifted.push('name');
        if (slug !== stored.slug) drifted.push('slug');

        if (drifted.length > 0) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Item uex_id=${record.uex_id} is locally managed but upstream data has drifted — ETL skipped`,
              rawPayload: { id: record.uex_id, drifted_fields: drifted },
            }),
          );
        }
        continue;
      }

      // Parse size: varchar like '1', '2' cast to smallint; if not parseable store NULL
      let sizeVal: number | null = null;
      if (record.size !== null && record.size !== undefined) {
        const parsed = parseInt(record.size, 10);
        if (!isNaN(parsed)) {
          sizeVal = parsed;
        }
      }

      const baseProperties = {
        size: record.size ?? null,
      };

      const attributes = {
        company_name: record.company_name ?? null,
        uuid: record.uuid ?? null,
        star_citizen_uuid: record.star_citizen_uuid ?? null,
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
           $1, 'item', $2, $3, $4,
           TRUE, NULL, NULL,
           $5, $6, NULL, NULL,
           NULL, NULL, NULL, NULL,
           FALSE, $7, $8,
           NOW(), NOW()
         )
         ON CONFLICT (slug) DO UPDATE SET
           category_id=EXCLUDED.category_id,
           uex_id=EXCLUDED.uex_id,
           name=EXCLUDED.name,
           is_available_live=EXCLUDED.is_available_live,
           size=EXCLUDED.size,
           scu=EXCLUDED.scu,
           base_properties=EXCLUDED.base_properties,
           attributes=EXCLUDED.attributes,
           updated_at=NOW()
         WHERE station_catalog_entry.is_locally_managed = FALSE`,
        [
          record.catalog_category_id, // $1  category_id
          record.uex_id, // $2  uex_id
          record.name, // $3  name
          slug, // $4  slug
          sizeVal, // $5  size
          null, // $6  scu (not available from station_item)
          JSON.stringify(baseProperties), // $7  base_properties
          JSON.stringify(attributes), // $8  attributes
        ],
      );
      upserted++;
    }

    this.logger.info(
      { runId: ctx.runId, upserted, skipped },
      'items-catalog-sync step complete',
    );
  }
}
