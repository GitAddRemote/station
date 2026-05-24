import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexStarSystem {
  id: number;
  id_faction: number | null;
  id_jurisdiction: number | null;
  name: string;
  code: string | null;
  is_available: number;
  is_available_live: number;
  is_visible: number;
  is_default: number;
  wiki: string | null;
  date_added: number;
  date_modified: number;
}

interface UexFaction {
  id: number;
  name: string;
  ids_star_systems: string;
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
export class StarSystemsSyncStep implements EtlStep {
  readonly name = 'star-systems-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(StarSystemsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const systems =
      await this.uexApiClient.get<UexStarSystem[]>('/star_systems');
    this.logger.info(
      { runId: ctx.runId, count: systems.length },
      'Fetched star systems from UEX',
    );

    const factionRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_faction`,
    );
    const knownFactions = new Set(factionRows.map((r) => r.uex_id));

    const jurisdictionRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_jurisdiction`,
    );
    const knownJurisdictions = new Set(jurisdictionRows.map((r) => r.uex_id));

    for (const record of systems) {
      if (!record.name) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: 'Star system missing name',
          rawPayload: { id: record.id },
        });
        await this.warningsRepo.save(warning);
        continue;
      }

      let factionUexId = record.id_faction ?? null;
      if (factionUexId !== null && !knownFactions.has(factionUexId)) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Star system ${record.id} references unknown faction ${factionUexId} — stored as null`,
          rawPayload: { id: record.id, missing_faction_id: factionUexId },
        });
        await this.warningsRepo.save(warning);
        factionUexId = null;
      }

      let jurisdictionUexId = record.id_jurisdiction ?? null;
      if (
        jurisdictionUexId !== null &&
        !knownJurisdictions.has(jurisdictionUexId)
      ) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Star system ${record.id} references unknown jurisdiction ${jurisdictionUexId} — stored as null`,
          rawPayload: {
            id: record.id,
            missing_jurisdiction_id: jurisdictionUexId,
          },
        });
        await this.warningsRepo.save(warning);
        jurisdictionUexId = null;
      }

      await this.dataSource.query(
        `INSERT INTO station_star_system
           (uex_id, faction_uex_id, jurisdiction_uex_id, name, code,
            is_available, is_available_live, is_visible, is_default,
            wiki, uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           faction_uex_id=EXCLUDED.faction_uex_id,
           jurisdiction_uex_id=EXCLUDED.jurisdiction_uex_id,
           name=EXCLUDED.name, code=EXCLUDED.code,
           is_available=EXCLUDED.is_available,
           is_available_live=EXCLUDED.is_available_live,
           is_visible=EXCLUDED.is_visible,
           is_default=EXCLUDED.is_default,
           wiki=EXCLUDED.wiki,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          factionUexId,
          jurisdictionUexId,
          record.name,
          record.code ?? null,
          Boolean(record.is_available),
          Boolean(record.is_available_live),
          Boolean(record.is_visible),
          Boolean(record.is_default),
          record.wiki ?? null,
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    await this.reconcileStarSystemJunctions(ctx);
    this.logger.info({ runId: ctx.runId }, 'star-systems-sync step complete');
  }

  private async reconcileStarSystemJunctions(
    ctx: EtlStepContext,
  ): Promise<void> {
    const factions = await this.uexApiClient.get<UexFaction[]>('/factions');

    const knownSystemIds = new Set(
      (
        await this.dataSource.query<{ uex_id: number }[]>(
          `SELECT uex_id FROM station_star_system`,
        )
      ).map((r) => r.uex_id),
    );

    for (const faction of factions) {
      if (!faction.name) continue;

      const starSystemIds = parseCsvInts(faction.ids_star_systems);

      await this.dataSource.query(
        `DELETE FROM station_faction_star_system WHERE faction_uex_id = $1`,
        [faction.id],
      );

      for (const ssId of starSystemIds) {
        if (!knownSystemIds.has(ssId)) {
          const warning = this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Star system ${ssId} not found — faction_star_system link skipped`,
            rawPayload: { faction_id: faction.id, missing_id: ssId },
          });
          await this.warningsRepo.save(warning);
          continue;
        }
        await this.dataSource.query(
          `INSERT INTO station_faction_star_system (faction_uex_id, star_system_uex_id)
           VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [faction.id, ssId],
        );
      }
    }
  }
}
