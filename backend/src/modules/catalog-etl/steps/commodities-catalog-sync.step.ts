import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';

interface StationCommodityRow {
  uex_id: number;
  name: string;
  slug: string | null;
  code: string | null;
  kind: string | null;
  weight_scu: string | null;
  price_buy: string | null;
  price_sell: string | null;
  is_available_live: boolean;
  is_illegal: boolean;
  is_buyable: boolean;
  is_sellable: boolean;
  is_extractable: boolean;
  is_mineral: boolean;
  is_raw: boolean;
  is_pure: boolean;
  is_refined: boolean;
  is_refinable: boolean;
  is_harvestable: boolean;
  is_volatile_qt: boolean;
  is_volatile_time: boolean;
  is_inert: boolean;
  is_explosive: boolean;
  is_buggy: boolean;
  is_fuel: boolean;
  is_temporary: boolean;
  wiki: string | null;
  catalog_category_id: string | null;
}

interface StoredCatalogEntry {
  uex_id: number;
  name: string;
  slug: string;
  is_available_live: boolean;
  is_illegal: boolean | null;
}

@Injectable()
export class CommoditiesCatalogSyncStep implements EtlStep {
  readonly name = 'commodities-catalog-sync';

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(CommoditiesCatalogSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    // Load locally managed catalog entries for drift detection
    const locallyManagedRows = await this.dataSource.query<
      StoredCatalogEntry[]
    >(
      `SELECT uex_id, name, slug, is_available_live, is_illegal
       FROM station_catalog_entry
       WHERE is_locally_managed = TRUE AND catalog_kind = 'commodity'`,
    );
    const locallyManagedByUexId = new Map<number, StoredCatalogEntry>(
      locallyManagedRows.map((r) => [r.uex_id, r]),
    );

    // Load commodities joined with their category mapping
    const commodities = await this.dataSource.query<StationCommodityRow[]>(
      `SELECT sc.uex_id, sc.name, sc.slug, sc.code, sc.kind,
              sc.weight_scu, sc.price_buy, sc.price_sell,
              sc.is_available_live, sc.is_illegal,
              sc.is_buyable, sc.is_sellable, sc.is_extractable,
              sc.is_mineral, sc.is_raw, sc.is_pure, sc.is_refined,
              sc.is_refinable, sc.is_harvestable,
              sc.is_volatile_qt, sc.is_volatile_time, sc.is_inert,
              sc.is_explosive, sc.is_buggy, sc.is_fuel, sc.is_temporary,
              sc.wiki, ucm.catalog_category_id
       FROM station_commodity sc
       LEFT JOIN uex_commodity_category_map ucm ON ucm.commodity_uex_id = sc.uex_id`,
    );

    this.logger.info(
      { runId: ctx.runId, count: commodities.length },
      'Loaded commodities from station_commodity',
    );

    let upserted = 0;
    let skipped = 0;

    for (const record of commodities) {
      if (!record.catalog_category_id) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Commodity uex_id=${record.uex_id} has no catalog category mapping — skipped`,
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
        if (record.name !== stored.name) drifted.push('name');
        const slug = record.slug ?? `commodity-${record.uex_id}`;
        if (slug !== stored.slug) drifted.push('slug');
        if (record.is_available_live !== stored.is_available_live)
          drifted.push('is_available_live');
        if (record.is_illegal !== stored.is_illegal) drifted.push('is_illegal');

        if (drifted.length > 0) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Commodity uex_id=${record.uex_id} is locally managed but upstream data has drifted — ETL skipped`,
              rawPayload: { id: record.uex_id, drifted_fields: drifted },
            }),
          );
        }
        continue;
      }

      const slug = record.slug ?? `commodity-${record.uex_id}`;

      const baseProperties = {
        weight_scu: record.weight_scu ?? null,
        price_buy: record.price_buy ?? null,
        price_sell: record.price_sell ?? null,
        is_buyable: record.is_buyable,
        is_sellable: record.is_sellable,
        is_extractable: record.is_extractable,
        is_mineral: record.is_mineral,
        is_raw: record.is_raw,
        is_pure: record.is_pure,
        is_refined: record.is_refined,
        is_refinable: record.is_refinable,
        is_harvestable: record.is_harvestable,
      };

      const attributes = {
        code: record.code ?? null,
        kind: record.kind ?? null,
        is_volatile_qt: record.is_volatile_qt,
        is_volatile_time: record.is_volatile_time,
        is_inert: record.is_inert,
        is_explosive: record.is_explosive,
        is_buggy: record.is_buggy,
        is_fuel: record.is_fuel,
        is_temporary: record.is_temporary,
        wiki: record.wiki ?? null,
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
           $1, 'commodity', $2, $3, $4,
           $5, $6, NULL,
           NULL, $7, NULL, NULL,
           NULL, NULL, NULL, NULL,
           FALSE, $8, $9,
           NOW(), NOW()
         )
         ON CONFLICT (slug) DO UPDATE SET
           category_id=EXCLUDED.category_id,
           uex_id=EXCLUDED.uex_id,
           name=EXCLUDED.name,
           is_available_live=EXCLUDED.is_available_live,
           is_illegal=EXCLUDED.is_illegal,
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
          record.is_available_live, // $5  is_available_live
          record.is_illegal, // $6  is_illegal
          record.weight_scu ?? null, // $7  scu (weight_scu as scu)
          JSON.stringify(baseProperties), // $8  base_properties
          JSON.stringify(attributes), // $9  attributes
        ],
      );
      upserted++;
    }

    this.logger.info(
      { runId: ctx.runId, upserted, skipped },
      'commodities-catalog-sync step complete',
    );
  }
}
