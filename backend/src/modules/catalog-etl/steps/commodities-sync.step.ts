import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexCommodity {
  id: number;
  name: string;
  code: string;
  slug: string | null;
  kind: string | null;
  id_parent: number | null;
  id_company: number | null;
  weight_scu: number | null;
  price_buy: number | null;
  price_sell: number | null;
  is_available: number;
  is_available_live: number;
  is_visible: number;
  is_extractable: number;
  is_mineral: number;
  is_raw: number;
  is_pure: number;
  is_refined: number;
  is_refinable: number;
  is_harvestable: number;
  is_buyable: number;
  is_sellable: number;
  is_temporary: number;
  is_illegal: number;
  is_volatile_qt: number;
  is_volatile_time: number;
  is_inert: number;
  is_explosive: number;
  is_buggy: number;
  is_fuel: number;
  wiki: string | null;
  date_added: number | null;
  date_modified: number | null;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

@Injectable()
export class CommoditiesSyncStep implements EtlStep {
  readonly name = 'commodities-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(CommoditiesSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const commodities =
      await this.uexApiClient.get<UexCommodity[]>('/commodities');

    this.logger.info(
      { runId: ctx.runId, count: commodities.length },
      'Fetched commodities from UEX',
    );

    // Preload valid company uex_ids to guard the company_uex_id FK.
    const knownCompanyUexIds = new Set<number>(
      (
        await this.dataSource.query<{ uex_id: number }[]>(
          `SELECT uex_id FROM station_company`,
        )
      ).map((r) => r.uex_id),
    );

    // Pass 1a — upsert all commodities with parent_uex_id=NULL to satisfy the
    // self-referential FK regardless of arrival order in the UEX payload.
    let upserted = 0;
    let skipped = 0;
    const upsertedUexIds = new Set<number>();

    for (const record of commodities) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Commodity uex_id=${record.id} has no name — skipped`,
            rawPayload: { id: record.id },
          }),
        );
        skipped++;
        continue;
      }

      let companyUexId: number | null = record.id_company ?? null;
      if (companyUexId !== null && !knownCompanyUexIds.has(companyUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Commodity uex_id=${record.id} references unknown company uex_id=${companyUexId} — company_uex_id set to NULL`,
            rawPayload: { id: record.id, id_company: companyUexId },
          }),
        );
        companyUexId = null;
      }

      // Column layout (parent_uex_id is a NULL literal — no placeholder):
      // $1  uex_id        $2  company_uex_id  $3  name           $4  code
      // $5  slug          $6  kind            $7  weight_scu
      // $8  price_buy     $9  price_sell
      // $10 is_available  $11 is_available_live  $12 is_visible   $13 is_extractable
      // $14 is_mineral    $15 is_raw          $16 is_pure         $17 is_refined
      // $18 is_refinable  $19 is_harvestable  $20 is_buyable      $21 is_sellable
      // $22 is_temporary  $23 is_illegal      $24 is_volatile_qt  $25 is_volatile_time
      // $26 is_inert      $27 is_explosive    $28 is_buggy        $29 is_fuel
      // $30 wiki          $31 uex_date_added  $32 uex_date_modified
      // synced_at = NOW() literal
      await this.dataSource.query(
        `INSERT INTO station_commodity (
           uex_id, parent_uex_id, company_uex_id,
           name, code, slug, kind, weight_scu,
           price_buy, price_sell,
           is_available, is_available_live, is_visible, is_extractable,
           is_mineral, is_raw, is_pure, is_refined, is_refinable,
           is_harvestable, is_buyable, is_sellable, is_temporary,
           is_illegal, is_volatile_qt, is_volatile_time,
           is_inert, is_explosive, is_buggy, is_fuel,
           wiki, uex_date_added, uex_date_modified, synced_at
         )
         VALUES (
           $1,NULL,$2,
           $3,$4,$5,$6,$7,
           $8,$9,
           $10,$11,$12,$13,
           $14,$15,$16,$17,$18,
           $19,$20,$21,$22,
           $23,$24,$25,
           $26,$27,$28,$29,
           $30,$31,$32,NOW()
         )
         ON CONFLICT (uex_id) DO UPDATE SET
           company_uex_id=EXCLUDED.company_uex_id,
           name=EXCLUDED.name,
           code=EXCLUDED.code,
           slug=EXCLUDED.slug,
           kind=EXCLUDED.kind,
           weight_scu=EXCLUDED.weight_scu,
           price_buy=EXCLUDED.price_buy,
           price_sell=EXCLUDED.price_sell,
           is_available=EXCLUDED.is_available,
           is_available_live=EXCLUDED.is_available_live,
           is_visible=EXCLUDED.is_visible,
           is_extractable=EXCLUDED.is_extractable,
           is_mineral=EXCLUDED.is_mineral,
           is_raw=EXCLUDED.is_raw,
           is_pure=EXCLUDED.is_pure,
           is_refined=EXCLUDED.is_refined,
           is_refinable=EXCLUDED.is_refinable,
           is_harvestable=EXCLUDED.is_harvestable,
           is_buyable=EXCLUDED.is_buyable,
           is_sellable=EXCLUDED.is_sellable,
           is_temporary=EXCLUDED.is_temporary,
           is_illegal=EXCLUDED.is_illegal,
           is_volatile_qt=EXCLUDED.is_volatile_qt,
           is_volatile_time=EXCLUDED.is_volatile_time,
           is_inert=EXCLUDED.is_inert,
           is_explosive=EXCLUDED.is_explosive,
           is_buggy=EXCLUDED.is_buggy,
           is_fuel=EXCLUDED.is_fuel,
           wiki=EXCLUDED.wiki,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id, // $1  uex_id
          // parent_uex_id = NULL literal (set in pass 1b)
          companyUexId, // $2  company_uex_id
          record.name, // $3  name
          record.code, // $4  code
          record.slug ?? null, // $5  slug
          record.kind ?? null, // $6  kind
          record.weight_scu ?? null, // $7  weight_scu
          record.price_buy ?? null, // $8  price_buy
          record.price_sell ?? null, // $9  price_sell
          Boolean(record.is_available), // $10
          Boolean(record.is_available_live), // $11
          Boolean(record.is_visible), // $12
          Boolean(record.is_extractable), // $13
          Boolean(record.is_mineral), // $14
          Boolean(record.is_raw), // $15
          Boolean(record.is_pure), // $16
          Boolean(record.is_refined), // $17
          Boolean(record.is_refinable), // $18
          Boolean(record.is_harvestable), // $19
          Boolean(record.is_buyable), // $20
          Boolean(record.is_sellable), // $21
          Boolean(record.is_temporary), // $22
          Boolean(record.is_illegal), // $23
          Boolean(record.is_volatile_qt), // $24
          Boolean(record.is_volatile_time), // $25
          Boolean(record.is_inert), // $26
          Boolean(record.is_explosive), // $27
          Boolean(record.is_buggy), // $28
          Boolean(record.is_fuel), // $29
          record.wiki ?? null, // $30 wiki
          toDate(record.date_added), // $31 uex_date_added
          toDate(record.date_modified), // $32 uex_date_modified
          // synced_at = NOW() literal
        ],
      );
      upsertedUexIds.add(record.id);
      upserted++;
    }

    // Pass 1b — set parent_uex_id for commodities whose parent was also upserted.
    // ON CONFLICT in pass 1a does not touch parent_uex_id, so existing links are
    // preserved across runs; only explicit updates (here and in pass 1c) change it.
    // Skip rows whose id_parent is not in the current payload to avoid FK violations.
    for (const record of commodities) {
      if (!record.name || !record.id_parent) continue;
      if (!upsertedUexIds.has(record.id_parent)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Commodity uex_id=${record.id} references unknown parent uex_id=${record.id_parent} — parent_uex_id not set`,
            rawPayload: { id: record.id, id_parent: record.id_parent },
          }),
        );
        continue;
      }
      await this.dataSource.query(
        `UPDATE station_commodity
         SET parent_uex_id = $1
         WHERE uex_id = $2
           AND parent_uex_id IS DISTINCT FROM $1`,
        [record.id_parent, record.id],
      );
    }

    // Pass 1c — clear parent_uex_id for commodities that UEX has de-parented.
    if (upsertedUexIds.size > 0) {
      const deParentedIds = commodities
        .filter((c) => c.name && !c.id_parent)
        .map((c) => c.id);
      if (deParentedIds.length > 0) {
        await this.dataSource.query(
          `UPDATE station_commodity
           SET parent_uex_id = NULL
           WHERE uex_id = ANY($1)
             AND parent_uex_id IS NOT NULL`,
          [deParentedIds],
        );
      }
    }

    this.logger.info(
      { runId: ctx.runId, upserted, skipped },
      'commodities-sync step complete',
    );
  }
}
