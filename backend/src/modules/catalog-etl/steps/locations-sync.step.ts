import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlWarning } from '../entities/etl-warning.entity';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';

type SourceType = 'city' | 'space_station' | 'outpost' | 'poi';

type SourceRow = {
  id: string;
  name: string;
  star_system_uex_id: number | null;
  planet_uex_id: number | null;
  moon_uex_id: number | null;
  is_available_live: boolean;
  is_locally_managed: boolean;
};

type SourceConfig = {
  table: string;
  sourceType: SourceType;
};

type DataSourceRow = {
  id: string;
  code: string;
};

const SOURCE_CONFIGS: SourceConfig[] = [
  { table: 'station_city', sourceType: 'city' },
  { table: 'station_space_station', sourceType: 'space_station' },
  { table: 'station_outpost', sourceType: 'outpost' },
  { table: 'station_poi', sourceType: 'poi' },
];

function buildLocationSlug(sourceType: SourceType, sourceId: string): string {
  return `${sourceType}-${sourceId}`;
}

@Injectable()
export class LocationsSyncStep implements EtlStep {
  readonly name = 'locations-sync';

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(LocationsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const dataSources = await this.dataSource.query<DataSourceRow[]>(
      `
        SELECT "id", "code"
        FROM "station_data_source"
        WHERE "code" IN ('system', 'uex-api')
      `,
    );

    const dataSourceIdByCode = new Map(
      dataSources.map((row) => [row.code, row.id]),
    );
    const systemDataSourceId = dataSourceIdByCode.get('system');
    const uexApiDataSourceId = dataSourceIdByCode.get('uex-api');

    if (!systemDataSourceId || !uexApiDataSourceId) {
      throw new Error(
        'station_data_source must contain seeded system and uex-api rows before locations-sync can run',
      );
    }

    for (const source of SOURCE_CONFIGS) {
      const rows = await this.dataSource.query<SourceRow[]>(
        `
          SELECT
            "id",
            "name",
            "star_system_uex_id",
            "planet_uex_id",
            "moon_uex_id",
            "is_available_live",
            "is_locally_managed"
          FROM "${source.table}"
          WHERE "is_available_live" = TRUE
        `,
      );

      // Two separate slug sets — pruning is scoped per data source so UEX-API
      // rows and system rows don't collide with each other during prune.
      const uexActiveSlugs: string[] = [];
      const systemActiveSlugs: string[] = [];

      for (const row of rows) {
        const slug = buildLocationSlug(source.sourceType, row.id);

        // Track slug in the appropriate prune set before any name/validity check
        // so a transient bad-name row doesn't cause an existing projection to be
        // pruned as stale.
        if (row.is_locally_managed) {
          systemActiveSlugs.push(slug);
        } else {
          uexActiveSlugs.push(slug);
        }

        if (!row.name?.trim()) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `${source.sourceType} source row ${row.id} missing name — skipped`,
              rawPayload: {
                source_table: source.table,
                source_type: source.sourceType,
                source_id: row.id,
              },
            }),
          );
          continue;
        }

        // Locally-managed rows are admin-authored; project them under the system
        // data source so their provenance is explicit in station_location.
        const dataSourceId = row.is_locally_managed
          ? systemDataSourceId
          : uexApiDataSourceId;

        await this.dataSource.query(
          `
            INSERT INTO "station_location" (
              "data_source_id",
              "source_type",
              "source_id",
              "slug",
              "name",
              "star_system_uex_id",
              "planet_uex_id",
              "moon_uex_id",
              "is_available_live",
              "is_locally_managed",
              "created_at",
              "updated_at"
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()
            )
            ON CONFLICT ("slug") DO UPDATE SET
              "data_source_id" = EXCLUDED."data_source_id",
              "source_type" = EXCLUDED."source_type",
              "source_id" = EXCLUDED."source_id",
              "name" = EXCLUDED."name",
              "star_system_uex_id" = EXCLUDED."star_system_uex_id",
              "planet_uex_id" = EXCLUDED."planet_uex_id",
              "moon_uex_id" = EXCLUDED."moon_uex_id",
              "is_available_live" = EXCLUDED."is_available_live",
              "is_locally_managed" = EXCLUDED."is_locally_managed",
              "updated_at" = NOW()
          `,
          [
            dataSourceId,
            source.sourceType,
            row.id,
            slug,
            row.name,
            row.star_system_uex_id ?? null,
            row.planet_uex_id ?? null,
            row.moon_uex_id ?? null,
            true,
            row.is_locally_managed,
          ],
        );
      }

      // Prune stale rows scoped by (source_type, data_source_id) so UEX-API
      // and system rows never prune each other.
      for (const [dataSourceId, activeSlugs] of [
        [uexApiDataSourceId, uexActiveSlugs],
        [systemDataSourceId, systemActiveSlugs],
      ] as [string, string[]][]) {
        if (activeSlugs.length === 0) {
          await this.dataSource.query(
            `
              DELETE FROM "station_location"
              WHERE "source_type" = $1
                AND "data_source_id" = $2
            `,
            [source.sourceType, dataSourceId],
          );
        } else {
          await this.dataSource.query(
            `
              DELETE FROM "station_location"
              WHERE "source_type" = $1
                AND "data_source_id" = $2
                AND NOT ("slug" = ANY($3::varchar[]))
            `,
            [source.sourceType, dataSourceId, activeSlugs],
          );
        }
      }
    }

    this.logger.info({ runId: ctx.runId }, 'locations-sync step complete');
  }
}
