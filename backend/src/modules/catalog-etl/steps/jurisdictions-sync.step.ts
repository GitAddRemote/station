import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexJurisdiction {
  id: number;
  id_faction: number;
  name: string;
  nickname: string | null;
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
export class JurisdictionsSyncStep implements EtlStep {
  readonly name = 'jurisdictions-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(JurisdictionsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const jurisdictions =
      await this.uexApiClient.get<UexJurisdiction[]>('/jurisdictions');
    this.logger.info(
      { runId: ctx.runId, count: jurisdictions.length },
      'Fetched jurisdictions from UEX',
    );

    for (const record of jurisdictions) {
      if (!record.name) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: 'Jurisdiction missing name',
          rawPayload: { id: record.id },
        });
        await this.warningsRepo.save(warning);
        continue;
      }

      if (String(record.id_faction).includes(',')) {
        throw new Error('id_faction contains CSV — schema review required');
      }

      await this.dataSource.query(
        `INSERT INTO station_jurisdiction (uex_id, faction_uex_id, name, nickname, is_available, is_available_live, is_visible, is_default, wiki, uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           faction_uex_id=EXCLUDED.faction_uex_id, name=EXCLUDED.name, nickname=EXCLUDED.nickname,
           is_available=EXCLUDED.is_available, is_available_live=EXCLUDED.is_available_live,
           is_visible=EXCLUDED.is_visible, is_default=EXCLUDED.is_default,
           wiki=EXCLUDED.wiki, uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified, synced_at=NOW()`,
        [
          record.id,
          record.id_faction,
          record.name,
          record.nickname ?? null,
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

    this.logger.info({ runId: ctx.runId }, 'jurisdictions-sync step complete');
  }
}
