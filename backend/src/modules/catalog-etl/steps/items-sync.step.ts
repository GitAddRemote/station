import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexItemAttribute {
  id: number;
  id_category: number | null;
  id_category_attribute: number;
  value: string | null;
  unit: string | null;
  date_added: number | null;
  date_modified: number | null;
}

interface UexItem {
  id: number;
  uuid: string | null;
  id_parent: number | null;
  id_category: number | null;
  id_company: number | null;
  id_vehicle: number | null;
  name: string;
  slug: string | null;
  size: string | null;
  color: string | null;
  color2: string | null;
  quality: number | null;
  url_store: string | null;
  is_exclusive_pledge: number;
  is_exclusive_subscriber: number;
  is_exclusive_concierge: number;
  is_commodity: number;
  is_harvestable: number;
  screenshot: string | null;
  notification: unknown | null;
  game_version: string | null;
  date_added: number | null;
  date_modified: number | null;
  attributes?: UexItemAttribute[];
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

function buildAttributesSummary(
  attributes: UexItemAttribute[] | undefined,
  knownCategoryAttributeUexIds: Set<number>,
): Record<string, string | null> {
  if (!attributes?.length) return {};
  const summary: Record<string, string | null> = {};
  for (const attr of attributes) {
    if (!attr.id_category_attribute) continue;
    if (!knownCategoryAttributeUexIds.has(attr.id_category_attribute)) continue;
    summary[String(attr.id_category_attribute)] = attr.value ?? null;
  }
  return summary;
}

@Injectable()
export class ItemsSyncStep implements EtlStep {
  readonly name = 'items-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(ItemsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const items = await this.uexApiClient.get<UexItem[]>('/items');

    this.logger.info(
      { runId: ctx.runId, count: items.length },
      'Fetched items from UEX',
    );

    // Preload valid FK sets to guard company_uex_id, vehicle_uex_id, and
    // category_attribute_uex_id before any writes.
    const [companyRows, vehicleRows, categoryAttrRows] = await Promise.all([
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_company`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_vehicle`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_category_attribute`,
      ),
    ]);
    const knownCompanyUexIds = new Set<number>(
      companyRows.map((r) => r.uex_id),
    );
    const knownVehicleUexIds = new Set<number>(
      vehicleRows.map((r) => r.uex_id),
    );
    const knownCategoryAttributeUexIds = new Set<number>(
      categoryAttrRows.map((r) => r.uex_id),
    );

    // Pass 1a — upsert all items with parent_uex_id=NULL to satisfy the
    // self-referential FK regardless of arrival order.
    let upserted = 0;
    let skipped = 0;
    const upsertedUexIds = new Set<number>();

    for (const record of items) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Item uex_id=${record.id} has no name — skipped`,
            rawPayload: { id: record.id },
          }),
        );
        skipped++;
        continue;
      }

      const attributesSummary = buildAttributesSummary(
        record.attributes,
        knownCategoryAttributeUexIds,
      );

      let companyUexId: number | null = record.id_company ?? null;
      if (companyUexId !== null && !knownCompanyUexIds.has(companyUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Item uex_id=${record.id} references unknown company uex_id=${companyUexId} — company_uex_id set to NULL`,
            rawPayload: { id: record.id, id_company: companyUexId },
          }),
        );
        companyUexId = null;
      }

      let vehicleUexId: number | null = record.id_vehicle ?? null;
      if (vehicleUexId !== null && !knownVehicleUexIds.has(vehicleUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Item uex_id=${record.id} references unknown vehicle uex_id=${vehicleUexId} — vehicle_uex_id set to NULL`,
            rawPayload: { id: record.id, id_vehicle: vehicleUexId },
          }),
        );
        vehicleUexId = null;
      }

      // Column layout (parent_uex_id is a NULL literal — no placeholder):
      // $1  uex_id           $2  category_uex_id   $3  company_uex_id
      // $4  vehicle_uex_id   $5  name              $6  slug
      // $7  uuid             $8  size              $9  color
      // $10 color2           $11 quality           $12 url_store
      // $13 is_exclusive_pledge  $14 is_exclusive_subscriber  $15 is_exclusive_concierge
      // $16 is_commodity    $17 is_harvestable     $18 screenshot
      // $19 notification    $20 attributes_summary $21 game_version
      // $22 uex_date_added  $23 uex_date_modified
      // synced_at = NOW() literal
      await this.dataSource.query(
        `INSERT INTO station_item (
           uex_id, parent_uex_id,
           category_uex_id, company_uex_id, vehicle_uex_id,
           name, slug, uuid, size, color, color2, quality,
           url_store,
           is_exclusive_pledge, is_exclusive_subscriber, is_exclusive_concierge,
           is_commodity, is_harvestable,
           screenshot, notification, attributes_summary,
           game_version, uex_date_added, uex_date_modified, synced_at
         )
         VALUES (
           $1,NULL,
           $2,$3,$4,
           $5,$6,$7,$8,$9,$10,$11,
           $12,
           $13,$14,$15,
           $16,$17,
           $18,$19,$20,
           $21,$22,$23,NOW()
         )
         ON CONFLICT (uex_id) DO UPDATE SET
           category_uex_id=EXCLUDED.category_uex_id,
           company_uex_id=EXCLUDED.company_uex_id,
           vehicle_uex_id=EXCLUDED.vehicle_uex_id,
           name=EXCLUDED.name,
           slug=EXCLUDED.slug,
           uuid=EXCLUDED.uuid,
           size=EXCLUDED.size,
           color=EXCLUDED.color,
           color2=EXCLUDED.color2,
           quality=EXCLUDED.quality,
           url_store=EXCLUDED.url_store,
           is_exclusive_pledge=EXCLUDED.is_exclusive_pledge,
           is_exclusive_subscriber=EXCLUDED.is_exclusive_subscriber,
           is_exclusive_concierge=EXCLUDED.is_exclusive_concierge,
           is_commodity=EXCLUDED.is_commodity,
           is_harvestable=EXCLUDED.is_harvestable,
           screenshot=EXCLUDED.screenshot,
           notification=EXCLUDED.notification,
           attributes_summary=EXCLUDED.attributes_summary,
           game_version=EXCLUDED.game_version,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id, // $1  uex_id
          // parent_uex_id = NULL literal
          record.id_category ?? null, // $2  category_uex_id
          companyUexId, // $3  company_uex_id
          vehicleUexId, // $4  vehicle_uex_id
          record.name, // $5  name
          record.slug ?? null, // $6  slug
          record.uuid ?? null, // $7  uuid
          record.size ?? null, // $8  size
          record.color ?? null, // $9  color
          record.color2 ?? null, // $10 color2
          record.quality ?? null, // $11 quality
          record.url_store ?? null, // $12 url_store
          Boolean(record.is_exclusive_pledge), // $13
          Boolean(record.is_exclusive_subscriber), // $14
          Boolean(record.is_exclusive_concierge), // $15
          Boolean(record.is_commodity), // $16
          Boolean(record.is_harvestable), // $17
          record.screenshot ?? null, // $18 screenshot
          record.notification ?? null, // $19 notification
          JSON.stringify(attributesSummary), // $20 attributes_summary
          record.game_version ?? null, // $21 game_version
          toDate(record.date_added), // $22 uex_date_added
          toDate(record.date_modified), // $23 uex_date_modified
          // synced_at = NOW() literal
        ],
      );
      upsertedUexIds.add(record.id);
      upserted++;
    }

    // Pass 1b — set parent_uex_id for items whose parent was also upserted.
    // ON CONFLICT in pass 1a does not touch parent_uex_id, so existing links are
    // preserved across runs; only explicit updates (here and in pass 1c) change it.
    for (const record of items) {
      if (!record.name || !record.id_parent) continue;
      if (!upsertedUexIds.has(record.id_parent)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Item uex_id=${record.id} references unknown parent uex_id=${record.id_parent} — parent_uex_id not set`,
            rawPayload: { id: record.id, id_parent: record.id_parent },
          }),
        );
        continue;
      }
      await this.dataSource.query(
        `UPDATE station_item
         SET parent_uex_id = $1
         WHERE uex_id = $2
           AND parent_uex_id IS DISTINCT FROM $1`,
        [record.id_parent, record.id],
      );
    }

    // Pass 1c — clear parent_uex_id for items that UEX has de-parented.
    if (upsertedUexIds.size > 0) {
      const deParentedIds = items
        .filter((i) => i.name && !i.id_parent)
        .map((i) => i.id);
      if (deParentedIds.length > 0) {
        await this.dataSource.query(
          `UPDATE station_item
           SET parent_uex_id = NULL
           WHERE uex_id = ANY($1)
             AND parent_uex_id IS NOT NULL`,
          [deParentedIds],
        );
      }
    }

    this.logger.info({ runId: ctx.runId, upserted, skipped }, 'items upserted');

    // Pass 2 — upsert item attributes.
    // Each attribute row has its own uex_id; we upsert on that.
    let attrUpserted = 0;
    let attrSkipped = 0;

    for (const record of items) {
      if (!record.name) continue;
      for (const attr of record.attributes ?? []) {
        if (!attr.id_category_attribute) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Item attribute uex_id=${attr.id} has no category_attribute_uex_id — skipped`,
              rawPayload: { item_id: record.id, attr_id: attr.id },
            }),
          );
          attrSkipped++;
          continue;
        }

        if (!knownCategoryAttributeUexIds.has(attr.id_category_attribute)) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Item attribute uex_id=${attr.id} references unknown category_attribute uex_id=${attr.id_category_attribute} — skipped`,
              rawPayload: {
                item_id: record.id,
                attr_id: attr.id,
                id_category_attribute: attr.id_category_attribute,
              },
            }),
          );
          attrSkipped++;
          continue;
        }

        await this.dataSource.query(
          `INSERT INTO station_item_attribute
             (uex_id, item_uex_id, category_uex_id, category_attribute_uex_id,
              value, unit, uex_date_added, uex_date_modified, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
           ON CONFLICT (uex_id) DO UPDATE SET
             item_uex_id=EXCLUDED.item_uex_id,
             category_uex_id=EXCLUDED.category_uex_id,
             category_attribute_uex_id=EXCLUDED.category_attribute_uex_id,
             value=EXCLUDED.value,
             unit=EXCLUDED.unit,
             uex_date_added=EXCLUDED.uex_date_added,
             uex_date_modified=EXCLUDED.uex_date_modified,
             synced_at=NOW()`,
          [
            attr.id, // $1 uex_id
            record.id, // $2 item_uex_id
            attr.id_category ?? null, // $3 category_uex_id
            attr.id_category_attribute, // $4 category_attribute_uex_id
            attr.value ?? null, // $5 value
            attr.unit ?? null, // $6 unit
            toDate(attr.date_added), // $7 uex_date_added
            toDate(attr.date_modified), // $8 uex_date_modified
          ],
        );
        attrUpserted++;
      }
    }

    this.logger.info(
      { runId: ctx.runId, attrUpserted, attrSkipped },
      'item attributes upserted',
    );
  }
}
