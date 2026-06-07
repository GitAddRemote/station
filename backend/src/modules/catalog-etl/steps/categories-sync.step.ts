import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexCategory {
  id: number;
  name: string;
  code: string | null;
  type: string | null;
  section: string | null;
  is_game_related: number;
  is_mining: number;
  date_added: number | null;
  date_modified: number | null;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

const VALID_TYPES = new Set(['item', 'service', 'contract']);

function mapType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return VALID_TYPES.has(lower) ? lower : null;
}

@Injectable()
export class CategoriesSyncStep implements EtlStep {
  readonly name = 'categories-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(CategoriesSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const categories =
      await this.uexApiClient.get<UexCategory[]>('/categories');
    this.logger.info(
      { runId: ctx.runId, count: categories.length },
      'Fetched categories from UEX',
    );

    // Step 1 — collect unique (type, section) pairs and upsert synthetic section rows.
    // Section rows are uniquely identified by (type, name) WHERE is_section = TRUE.
    // We RETURNING id so we can resolve parent_id for leaf rows.
    const sectionKey = (type: string | null, section: string) =>
      `${type ?? ''}::${section}`;

    const sectionRows = new Map<
      string,
      { type: string | null; section: string }
    >();
    for (const cat of categories) {
      const section = cat.section?.trim() || null;
      if (section) {
        const key = sectionKey(mapType(cat.type), section);
        if (!sectionRows.has(key)) {
          sectionRows.set(key, { type: mapType(cat.type), section });
        }
      }
    }

    // Upsert section rows and build a key → id map for parent FK resolution
    const sectionIdByKey = new Map<string, number>();
    for (const [key, { type, section }] of sectionRows) {
      const rows = await this.dataSource.query<{ id: number }[]>(
        `INSERT INTO station_category
           (uex_id, parent_id, type, section, name, is_section,
            is_game_related, is_mining, synced_at)
         VALUES (NULL, NULL, $1, $2, $3, TRUE, FALSE, FALSE, NOW())
         ON CONFLICT ((COALESCE(type, '')), name) WHERE is_section = TRUE DO UPDATE SET
           section=EXCLUDED.section,
           synced_at=NOW()
         RETURNING id`,
        [type, section, section],
      );
      sectionIdByKey.set(key, rows[0].id);
    }

    // Step 2 — upsert leaf category rows with parent_id set to the section row
    let upserted = 0;
    let skipped = 0;

    for (const record of categories) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: 'Category missing name',
            rawPayload: { id: record.id },
          }),
        );
        skipped++;
        continue;
      }

      const type = mapType(record.type);
      if (record.type && type === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Category ${record.id} has unknown type '${record.type}' — stored as null`,
            rawPayload: { id: record.id, raw_type: record.type },
          }),
        );
      }

      const section = record.section?.trim() || null;
      const parentId = section
        ? (sectionIdByKey.get(sectionKey(type, section)) ?? null)
        : null;

      await this.dataSource.query(
        `INSERT INTO station_category
           (uex_id, parent_id, type, section, name, is_section,
            is_game_related, is_mining,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,FALSE,$6,$7,$8,$9,NOW())
         ON CONFLICT (uex_id) WHERE uex_id IS NOT NULL DO UPDATE SET
           parent_id=EXCLUDED.parent_id,
           type=EXCLUDED.type,
           section=EXCLUDED.section,
           name=EXCLUDED.name,
           is_game_related=EXCLUDED.is_game_related,
           is_mining=EXCLUDED.is_mining,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          parentId,
          type,
          section,
          record.name,
          Boolean(record.is_game_related),
          Boolean(record.is_mining),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
      upserted++;
    }

    this.logger.info(
      {
        runId: ctx.runId,
        sections: sectionRows.size,
        upserted,
        skipped,
      },
      'categories-sync step complete',
    );
  }
}
