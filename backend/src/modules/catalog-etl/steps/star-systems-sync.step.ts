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
          record.id_faction ?? null,
          record.id_jurisdiction ?? null,
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

    this.logger.info({ runId: ctx.runId }, 'star-systems-sync step complete');
  }
}
