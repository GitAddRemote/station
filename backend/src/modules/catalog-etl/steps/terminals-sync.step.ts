import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

// Maps UEX API type strings to the schema CHECK-constraint enum values
const TERMINAL_TYPE_MAP: Record<string, string> = {
  commodity: 'commodity',
  item: 'item',
  commodity_raw: 'commodity_raw',
  vehicle_buy: 'vehicle_buy',
  vehicle_rent: 'vehicle_rent',
  fuel: 'fuel',
  refinery_audit: 'refinery_audit',
  // UEX may send alternate casings or aliases
  refinery: 'refinery_audit',
  vehicle: 'vehicle_buy',
};

function mapTerminalType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return TERMINAL_TYPE_MAP[raw.toLowerCase()] ?? null;
}

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
  id_poi: number | null;
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
    const terminals = await this.uexApiClient.get<UexTerminal[]>('/terminals');
    this.logger.info(
      { runId: ctx.runId, count: terminals.length },
      'Fetched terminals from UEX',
    );

    // Load all parent entity BIGINT ids indexed by uex_id for FK resolution
    const [
      ssRows,
      outpostRows,
      cityRows,
      poiRows,
      starSystemRows,
      planetRows,
      orbitRows,
      moonRows,
      factionRows,
      companyRows,
    ] = await Promise.all([
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_space_station`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_outpost`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_city`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_poi`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_star_system`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_planet`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_orbit`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_moon`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_faction`,
      ),
      this.dataSource.query<{ uex_id: number; id: number }[]>(
        `SELECT uex_id, id FROM station_company`,
      ),
    ]);

    const ssByUexId = new Map(ssRows.map((r) => [r.uex_id, r.id]));
    const outpostByUexId = new Map(outpostRows.map((r) => [r.uex_id, r.id]));
    const cityByUexId = new Map(cityRows.map((r) => [r.uex_id, r.id]));
    const poiByUexId = new Map(poiRows.map((r) => [r.uex_id, r.id]));
    const starSystemByUexId = new Map(
      starSystemRows.map((r) => [r.uex_id, r.id]),
    );
    const planetByUexId = new Map(planetRows.map((r) => [r.uex_id, r.id]));
    const orbitByUexId = new Map(orbitRows.map((r) => [r.uex_id, r.id]));
    const moonByUexId = new Map(moonRows.map((r) => [r.uex_id, r.id]));
    const factionByUexId = new Map(factionRows.map((r) => [r.uex_id, r.id]));
    const companyByUexId = new Map(companyRows.map((r) => [r.uex_id, r.id]));

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

      const type = mapTerminalType(record.type);
      if (type === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Terminal ${record.id} has unknown type '${record.type}' — skipped`,
            rawPayload: { terminal_id: record.id, raw_type: record.type },
          }),
        );
        continue;
      }

      // Resolve primary location FK (space station → outpost → city priority)
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

      // Resolve poi_id — nullable, silently null when not found
      const poiId =
        record.id_poi !== null ? (poiByUexId.get(record.id_poi) ?? null) : null;

      const secondaryWarnings: EtlWarning[] = [];
      const queueSecondaryWarning = (
        fieldName: string,
        unresolvedUexId: number,
        label: string,
      ) => {
        secondaryWarnings.push(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Terminal ${record.id} references unknown ${label} ${unresolvedUexId} — FK stored as null`,
            rawPayload: {
              terminal_id: record.id,
              [fieldName]: unresolvedUexId,
            },
          }),
        );
      };

      // Resolve secondary FK columns — warn when source has a UEX ID that can't be resolved
      let starSystemId: number | null = null;
      if (record.id_star_system !== null) {
        starSystemId = starSystemByUexId.get(record.id_star_system) ?? null;
        if (starSystemId === null) {
          queueSecondaryWarning(
            'id_star_system',
            record.id_star_system,
            'star system',
          );
        }
      }

      let planetId: number | null = null;
      if (record.id_planet !== null) {
        planetId = planetByUexId.get(record.id_planet) ?? null;
        if (planetId === null) {
          queueSecondaryWarning('id_planet', record.id_planet, 'planet');
        }
      }

      let orbitId: number | null = null;
      if (record.id_orbit !== null) {
        orbitId = orbitByUexId.get(record.id_orbit) ?? null;
        if (orbitId === null) {
          queueSecondaryWarning('id_orbit', record.id_orbit, 'orbit');
        }
      }

      let moonId: number | null = null;
      if (record.id_moon !== null) {
        moonId = moonByUexId.get(record.id_moon) ?? null;
        if (moonId === null) {
          queueSecondaryWarning('id_moon', record.id_moon, 'moon');
        }
      }

      let factionId: number | null = null;
      if (record.id_faction !== null) {
        factionId = factionByUexId.get(record.id_faction) ?? null;
        if (factionId === null) {
          queueSecondaryWarning('id_faction', record.id_faction, 'faction');
        }
      }

      let companyId: number | null = null;
      if (record.id_company !== null) {
        companyId = companyByUexId.get(record.id_company) ?? null;
        if (companyId === null) {
          queueSecondaryWarning('id_company', record.id_company, 'company');
        }
      }

      if (secondaryWarnings.length > 0) {
        await this.warningsRepo.save(secondaryWarnings);
      }

      await this.dataSource.query(
        `INSERT INTO station_terminal
           (uex_id, name, fullname, nickname, displayname, code, type, contact_url, screenshot,
            max_container_size, space_station_id, outpost_id, city_id, poi_id,
            star_system_id, planet_id, orbit_id, moon_id, faction_id, company_id,
            is_available, is_available_live, is_visible, is_default_system,
            is_affinity_influenceable, is_habitation, is_refinery, is_cargo_center,
            is_medical, is_food, is_shop_fps, is_shop_vehicle, is_refuel, is_repair,
            is_nqa, is_jump_point, is_player_owned, is_auto_load,
            has_loading_dock, has_docking_port, has_freight_elevator,
            game_version, uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                 $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,
                 $39,$40,$41,$42,$43,$44,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           name=EXCLUDED.name, fullname=EXCLUDED.fullname, nickname=EXCLUDED.nickname,
           displayname=EXCLUDED.displayname, code=EXCLUDED.code, type=EXCLUDED.type,
           contact_url=EXCLUDED.contact_url, screenshot=EXCLUDED.screenshot,
           max_container_size=EXCLUDED.max_container_size,
           space_station_id=EXCLUDED.space_station_id,
           outpost_id=EXCLUDED.outpost_id, city_id=EXCLUDED.city_id,
           poi_id=EXCLUDED.poi_id,
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
          record.id, // $1
          record.name, // $2
          record.fullname ?? null, // $3
          record.nickname ?? null, // $4
          record.displayname ?? null, // $5
          record.code, // $6
          type, // $7
          record.contact_url ?? null, // $8
          record.screenshot ?? null, // $9
          record.max_container_size ?? null, // $10
          spaceStationId, // $11
          outpostId, // $12
          cityId, // $13
          poiId, // $14
          starSystemId, // $15
          planetId, // $16
          orbitId, // $17
          moonId, // $18
          factionId, // $19
          companyId, // $20
          Boolean(record.is_available), // $21
          Boolean(record.is_available_live), // $22
          Boolean(record.is_visible), // $23
          Boolean(record.is_default_system), // $24
          Boolean(record.is_affinity_influenceable), // $25
          Boolean(record.is_habitation), // $26
          Boolean(record.is_refinery), // $27
          Boolean(record.is_cargo_center), // $28
          Boolean(record.is_medical), // $29
          Boolean(record.is_food), // $30
          Boolean(record.is_shop_fps), // $31
          Boolean(record.is_shop_vehicle), // $32
          Boolean(record.is_refuel), // $33
          Boolean(record.is_repair), // $34
          Boolean(record.is_nqa), // $35
          Boolean(record.is_jump_point), // $36
          Boolean(record.is_player_owned), // $37
          Boolean(record.is_auto_load), // $38
          Boolean(record.has_loading_dock), // $39
          Boolean(record.has_docking_port), // $40
          Boolean(record.has_freight_elevator), // $41
          record.game_version ?? null, // $42
          record.date_added ?? null, // $43
          record.date_modified ?? null, // $44
        ],
      );
    }

    this.logger.info(
      { runId: ctx.runId, count: terminals.length },
      'terminals-sync step complete',
    );
  }
}
