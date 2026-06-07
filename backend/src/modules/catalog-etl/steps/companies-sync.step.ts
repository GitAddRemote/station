import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexCompany {
  id: number;
  name: string;
  nickname: string | null;
  wiki: string | null;
  industry: string | null;
  is_item_manufacturer: number;
  is_vehicle_manufacturer: number;
  date_added: number;
  date_modified: number;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

@Injectable()
export class CompaniesSyncStep implements EtlStep {
  readonly name = 'companies-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(CompaniesSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const companies = await this.uexApiClient.get<UexCompany[]>('/companies');
    this.logger.info(
      { runId: ctx.runId, count: companies.length },
      'Fetched companies from UEX',
    );

    for (const record of companies) {
      if (!record.name) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: 'Company missing name',
          rawPayload: { id: record.id },
        });
        await this.warningsRepo.save(warning);
        continue;
      }

      await this.dataSource.query(
        `INSERT INTO station_company (uex_id, faction_uex_id, name, nickname, wiki, industry, is_item_manufacturer, is_vehicle_manufacturer, uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           faction_uex_id=NULL, name=EXCLUDED.name, nickname=EXCLUDED.nickname,
           wiki=EXCLUDED.wiki, industry=EXCLUDED.industry,
           is_item_manufacturer=EXCLUDED.is_item_manufacturer,
           is_vehicle_manufacturer=EXCLUDED.is_vehicle_manufacturer,
           uex_date_added=EXCLUDED.uex_date_added, uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          record.name,
          record.nickname ?? null,
          record.wiki ?? null,
          record.industry ?? null,
          Boolean(record.is_item_manufacturer),
          Boolean(record.is_vehicle_manufacturer),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    this.logger.info({ runId: ctx.runId }, 'companies-sync step complete');
  }
}
