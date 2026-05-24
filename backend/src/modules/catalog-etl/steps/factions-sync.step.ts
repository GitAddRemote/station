import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexFaction {
  id: number;
  name: string;
  wiki: string | null;
  ids_star_systems: string;
  ids_factions_friendly: string | null;
  ids_factions_hostile: string | null;
  is_piracy: number;
  is_bounty_hunting: number;
  date_added: number;
  date_modified: number;
}

function parseCsvInts(csv: string | null | undefined): number[] {
  if (!csv || csv.trim() === '') return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number)
    .filter((n) => !isNaN(n));
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

@Injectable()
export class FactionsSyncStep implements EtlStep {
  readonly name = 'factions-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(FactionsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const factions = await this.uexApiClient.get<UexFaction[]>('/factions');
    this.logger.info(
      { runId: ctx.runId, count: factions.length },
      'Fetched factions from UEX',
    );

    const fetchedIds = new Set(factions.map((f) => f.id));

    for (const record of factions) {
      if (!record.name) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: 'Faction missing name',
          rawPayload: { id: record.id },
        });
        await this.warningsRepo.save(warning);
        continue;
      }

      await this.dataSource.query(
        `INSERT INTO station_faction (uex_id, name, wiki, is_piracy, is_bounty_hunting, uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           name=EXCLUDED.name, wiki=EXCLUDED.wiki,
           is_piracy=EXCLUDED.is_piracy, is_bounty_hunting=EXCLUDED.is_bounty_hunting,
           uex_date_added=EXCLUDED.uex_date_added, uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          record.name,
          record.wiki ?? null,
          Boolean(record.is_piracy),
          Boolean(record.is_bounty_hunting),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    // Reconcile friendly/hostile junction tables per faction — delete existing
    // rows then re-insert current set so stale relationships are removed on
    // each run. Star-system junction reconciliation is deferred to
    // StarSystemsSyncStep so it runs after star systems are populated.
    for (const record of factions) {
      if (!record.name) continue;

      await this.reconcileFriendly(ctx, record, fetchedIds);
      await this.reconcileHostile(ctx, record, fetchedIds);
    }

    this.logger.info({ runId: ctx.runId }, 'factions-sync step complete');
  }

  private async reconcileFriendly(
    ctx: EtlStepContext,
    record: UexFaction,
    fetchedIds: Set<number>,
  ): Promise<void> {
    const friendlyIds = parseCsvInts(record.ids_factions_friendly);

    await this.dataSource.query(
      `DELETE FROM station_faction_friendly WHERE faction_uex_id = $1`,
      [record.id],
    );

    for (const friendlyId of friendlyIds) {
      if (!fetchedIds.has(friendlyId)) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Friendly faction ${friendlyId} not found in fetched set — link skipped`,
          rawPayload: { faction_id: record.id, missing_id: friendlyId },
        });
        await this.warningsRepo.save(warning);
        continue;
      }
      await this.dataSource.query(
        `INSERT INTO station_faction_friendly (faction_uex_id, friendly_faction_uex_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [record.id, friendlyId],
      );
    }
  }

  private async reconcileHostile(
    ctx: EtlStepContext,
    record: UexFaction,
    fetchedIds: Set<number>,
  ): Promise<void> {
    const hostileIds = parseCsvInts(record.ids_factions_hostile);

    await this.dataSource.query(
      `DELETE FROM station_faction_hostile WHERE faction_uex_id = $1`,
      [record.id],
    );

    for (const hostileId of hostileIds) {
      if (!fetchedIds.has(hostileId)) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Hostile faction ${hostileId} not found in fetched set — link skipped`,
          rawPayload: { faction_id: record.id, missing_id: hostileId },
        });
        await this.warningsRepo.save(warning);
        continue;
      }
      await this.dataSource.query(
        `INSERT INTO station_faction_hostile (faction_uex_id, hostile_faction_uex_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [record.id, hostileId],
      );
    }
  }
}
