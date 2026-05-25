import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

const SKIP_HOURS = 12;

interface UexTerminal {
  id: number;
  name: string;
  code: string;
  id_space_station: number | null;
  id_outpost: number | null;
  id_city: number | null;
  id_star_system: number | null;
  id_planet: number | null;
  id_orbit: number | null;
  id_moon: number | null;
  id_faction: number | null;
  id_company: number | null;
  fullname: string | null;
  nickname: string | null;
  displayname: string | null;
  contact_url: string | null;
  screenshot: string | null;
  max_container_size: number | null;
  type: string;
  is_available: number;
  is_available_live: number;
  is_visible: number;
  is_default_system: number;
  is_affinity_influenceable: number;
  is_habitation: number;
  is_refinery: number;
  is_cargo_center: number;
  is_medical: number;
  is_food: number;
  is_shop_fps: number;
  is_shop_vehicle: number;
  is_refuel: number;
  is_repair: number;
  is_nqa: number;
  is_jump_point: number;
  is_player_owned: number;
  is_auto_load: number;
  has_loading_dock: number;
  has_docking_port: number;
  has_freight_elevator: number;
  game_version: string | null;
  date_added: number | null;
  date_modified: number | null;
}

@Injectable()
export class TerminalsSyncStep implements EtlStep {
  readonly name = 'terminals-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(TerminalsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    // Skip guard: respect UEX 12-hour cache TTL
    const [lastRun] = await this.dataSource.query<
      { finished_at: Date | null }[]
    >(
      `SELECT finished_at FROM station_etl_run_state
       WHERE step_name = $1 AND status = 'completed'
       ORDER BY finished_at DESC LIMIT 1`,
      [this.name],
    );

    if (lastRun?.finished_at) {
      const hoursSince =
        (Date.now() - new Date(lastRun.finished_at).getTime()) /
        (1000 * 60 * 60);
      if (hoursSince < SKIP_HOURS) {
        this.logger.debug(
          { runId: ctx.runId, hoursSince: hoursSince.toFixed(1) },
          'terminals-sync skipped: last run was within 12h',
        );
        return;
      }
    }

    const terminals = await this.uexApiClient.get<UexTerminal[]>('/terminals');
    this.logger.info(
      { runId: ctx.runId, count: terminals.length },
      'Fetched terminals from UEX',
    );

    // Load parent entity BIGINT ids indexed by uex_id for FK resolution
    const [ssRows, outpostRows, cityRows] = await Promise.all([
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_space_station`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_outpost`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_city`,
      ),
    ]);

    const ssByUexId = new Map(ssRows.map((r) => [r.uex_id, r.id]));
    const outpostByUexId = new Map(outpostRows.map((r) => [r.uex_id, r.id]));
    const cityByUexId = new Map(cityRows.map((r) => [r.uex_id, r.id]));

    for (const record of terminals) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: 'Terminal missing name',
            rawPayload: { id: record.id },
          }),
        );
        continue;
      }

      // Resolve primary location FK
      let spaceStationId: number | null = null;
      let outpostId: number | null = null;
      let cityId: number | null = null;

      if (record.id_space_station !== null) {
        spaceStationId = ssByUexId.get(record.id_space_station) ?? null;
        if (spaceStationId === null) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Terminal ${record.id} references unknown space station ${record.id_space_station} — FK stored as null`,
              rawPayload: {
                terminal_id: record.id,
                id_space_station: record.id_space_station,
              },
            }),
          );
        }
      } else if (record.id_outpost !== null) {
        outpostId = outpostByUexId.get(record.id_outpost) ?? null;
        if (outpostId === null) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Terminal ${record.id} references unknown outpost ${record.id_outpost} — FK stored as null`,
              rawPayload: {
                terminal_id: record.id,
                id_outpost: record.id_outpost,
              },
            }),
          );
        }
      } else if (record.id_city !== null) {
        cityId = cityByUexId.get(record.id_city) ?? null;
        if (cityId === null) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Terminal ${record.id} references unknown city ${record.id_city} — FK stored as null`,
              rawPayload: { terminal_id: record.id, id_city: record.id_city },
            }),
          );
        }
      } else {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Terminal ${record.id} has no location parent (space_station, outpost, or city)`,
            rawPayload: { terminal_id: record.id },
          }),
        );
      }

      await this.dataSource.query(
        `INSERT INTO station_terminal
           (uex_id, name, fullname, nickname, displayname, code, type, contact_url, screenshot,
            max_container_size, space_station_id, outpost_id, city_id,
            star_system_id, planet_id, orbit_id, moon_id, faction_id, company_id,
            is_available, is_available_live, is_visible, is_default_system,
            is_affinity_influenceable, is_habitation, is_refinery, is_cargo_center,
            is_medical, is_food, is_shop_fps, is_shop_vehicle, is_refuel, is_repair,
            is_nqa, is_jump_point, is_player_owned, is_auto_load,
            has_loading_dock, has_docking_port, has_freight_elevator,
            game_version, uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                 $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,
                 $38,$39,$40,$41,$42,$43,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           name=EXCLUDED.name, fullname=EXCLUDED.fullname, nickname=EXCLUDED.nickname,
           displayname=EXCLUDED.displayname, code=EXCLUDED.code, type=EXCLUDED.type,
           contact_url=EXCLUDED.contact_url, screenshot=EXCLUDED.screenshot,
           max_container_size=EXCLUDED.max_container_size,
           space_station_id=EXCLUDED.space_station_id,
           outpost_id=EXCLUDED.outpost_id, city_id=EXCLUDED.city_id,
           star_system_id=EXCLUDED.star_system_id, planet_id=EXCLUDED.planet_id,
           orbit_id=EXCLUDED.orbit_id, moon_id=EXCLUDED.moon_id,
           faction_id=EXCLUDED.faction_id, company_id=EXCLUDED.company_id,
           is_available=EXCLUDED.is_available, is_available_live=EXCLUDED.is_available_live,
           is_visible=EXCLUDED.is_visible, is_default_system=EXCLUDED.is_default_system,
           is_affinity_influenceable=EXCLUDED.is_affinity_influenceable,
           is_habitation=EXCLUDED.is_habitation, is_refinery=EXCLUDED.is_refinery,
           is_cargo_center=EXCLUDED.is_cargo_center, is_medical=EXCLUDED.is_medical,
           is_food=EXCLUDED.is_food, is_shop_fps=EXCLUDED.is_shop_fps,
           is_shop_vehicle=EXCLUDED.is_shop_vehicle, is_refuel=EXCLUDED.is_refuel,
           is_repair=EXCLUDED.is_repair, is_nqa=EXCLUDED.is_nqa,
           is_jump_point=EXCLUDED.is_jump_point, is_player_owned=EXCLUDED.is_player_owned,
           is_auto_load=EXCLUDED.is_auto_load, has_loading_dock=EXCLUDED.has_loading_dock,
           has_docking_port=EXCLUDED.has_docking_port,
           has_freight_elevator=EXCLUDED.has_freight_elevator,
           game_version=EXCLUDED.game_version,
           uex_date_added=EXCLUDED.uex_date_added, uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          record.name,
          record.fullname ?? null,
          record.nickname ?? null,
          record.displayname ?? null,
          record.code,
          record.type,
          record.contact_url ?? null,
          record.screenshot ?? null,
          record.max_container_size ?? null,
          spaceStationId,
          outpostId,
          cityId,
          record.id_star_system ?? null,
          record.id_planet ?? null,
          record.id_orbit ?? null,
          record.id_moon ?? null,
          record.id_faction ?? null,
          record.id_company ?? null,
          Boolean(record.is_available),
          Boolean(record.is_available_live),
          Boolean(record.is_visible),
          Boolean(record.is_default_system),
          Boolean(record.is_affinity_influenceable),
          Boolean(record.is_habitation),
          Boolean(record.is_refinery),
          Boolean(record.is_cargo_center),
          Boolean(record.is_medical),
          Boolean(record.is_food),
          Boolean(record.is_shop_fps),
          Boolean(record.is_shop_vehicle),
          Boolean(record.is_refuel),
          Boolean(record.is_repair),
          Boolean(record.is_nqa),
          Boolean(record.is_jump_point),
          Boolean(record.is_player_owned),
          Boolean(record.is_auto_load),
          Boolean(record.has_loading_dock),
          Boolean(record.has_docking_port),
          Boolean(record.has_freight_elevator),
          record.game_version ?? null,
          record.date_added ?? null,
          record.date_modified ?? null,
        ],
      );
    }

    // Record completion in run_state for skip guard on next invocation
    await this.dataSource.query(
      `INSERT INTO station_etl_run_state (run_name, step_name, status, started_at, finished_at)
       VALUES ($1, $2, 'completed', NOW(), NOW())`,
      ['catalog-etl', this.name],
    );

    this.logger.info(
      { runId: ctx.runId, count: terminals.length },
      'terminals-sync step complete',
    );
  }
}
