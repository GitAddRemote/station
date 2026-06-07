import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexPoi {
  id: number;
  id_star_system: number | null;
  id_planet: number | null;
  id_moon: number | null;
  id_orbit: number | null;
  id_space_station: number | null;
  id_city: number | null;
  id_outpost: number | null;
  id_faction: number | null;
  id_jurisdiction: number | null;
  name: string;
  nickname: string | null;
  subtype: string | null;
  is_available: number;
  is_available_live: number;
  is_visible: number;
  is_default: number;
  is_monitored: number;
  is_armistice: number;
  is_landable: number;
  is_decommissioned: number;
  has_quantum_marker: number;
  has_trade_terminal: number;
  has_habitation: number;
  has_refinery: number;
  has_cargo_center: number;
  has_clinic: number;
  has_food: number;
  has_shops: number;
  has_refuel: number;
  has_repair: number;
  has_gravity: number;
  has_loading_dock: number;
  has_docking_port: number;
  has_freight_elevator: number;
  pad_types: string | null;
  date_added: number;
  date_modified: number;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

function parsePadTypes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

@Injectable()
export class PoisSyncStep implements EtlStep {
  readonly name = 'pois-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(PoisSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const pois = await this.uexApiClient.get<UexPoi[]>('/poi');
    this.logger.info(
      { runId: ctx.runId, count: pois.length },
      'Fetched POIs from UEX',
    );

    const [
      starSystemRows,
      planetRows,
      moonRows,
      orbitRows,
      spaceStationRows,
      cityRows,
      outpostRows,
      factionRows,
      jurisdictionRows,
      locallyManagedRows,
    ] = await Promise.all([
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_star_system`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_planet`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_moon`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_orbit`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_space_station`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_city`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_outpost`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_faction`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_jurisdiction`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_poi WHERE is_locally_managed = TRUE`,
      ),
    ]);

    const knownStarSystems = new Set(starSystemRows.map((r) => r.uex_id));
    const knownPlanets = new Set(planetRows.map((r) => r.uex_id));
    const knownMoons = new Set(moonRows.map((r) => r.uex_id));
    const knownOrbits = new Set(orbitRows.map((r) => r.uex_id));
    const knownSpaceStations = new Set(spaceStationRows.map((r) => r.uex_id));
    const knownCities = new Set(cityRows.map((r) => r.uex_id));
    const knownOutposts = new Set(outpostRows.map((r) => r.uex_id));
    const knownFactions = new Set(factionRows.map((r) => r.uex_id));
    const knownJurisdictions = new Set(jurisdictionRows.map((r) => r.uex_id));
    const locallyManagedUexIds = new Set<number>(
      locallyManagedRows.map((r) => r.uex_id),
    );

    for (const record of pois) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: 'POI missing name',
            rawPayload: { id: record.id },
          }),
        );
        continue;
      }

      if (locallyManagedUexIds.has(record.id)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI uex_id=${record.id} is locally managed — ETL skipped`,
            rawPayload: { id: record.id },
          }),
        );
        continue;
      }

      let starSystemUexId = record.id_star_system ?? null;
      if (starSystemUexId !== null && !knownStarSystems.has(starSystemUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown star system ${starSystemUexId} — stored as null`,
            rawPayload: {
              poi_id: record.id,
              missing_star_system_id: starSystemUexId,
            },
          }),
        );
        starSystemUexId = null;
      }

      let planetUexId = record.id_planet ?? null;
      if (planetUexId !== null && !knownPlanets.has(planetUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown planet ${planetUexId} — stored as null`,
            rawPayload: { poi_id: record.id, missing_planet_id: planetUexId },
          }),
        );
        planetUexId = null;
      }

      let moonUexId = record.id_moon ?? null;
      if (moonUexId !== null && !knownMoons.has(moonUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown moon ${moonUexId} — stored as null`,
            rawPayload: { poi_id: record.id, missing_moon_id: moonUexId },
          }),
        );
        moonUexId = null;
      }

      let orbitUexId = record.id_orbit ?? null;
      if (orbitUexId !== null && !knownOrbits.has(orbitUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown orbit ${orbitUexId} — stored as null`,
            rawPayload: { poi_id: record.id, missing_orbit_id: orbitUexId },
          }),
        );
        orbitUexId = null;
      }

      let spaceStationUexId = record.id_space_station ?? null;
      if (
        spaceStationUexId !== null &&
        !knownSpaceStations.has(spaceStationUexId)
      ) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown space station ${spaceStationUexId} — stored as null`,
            rawPayload: {
              poi_id: record.id,
              missing_space_station_id: spaceStationUexId,
            },
          }),
        );
        spaceStationUexId = null;
      }

      let cityUexId = record.id_city ?? null;
      if (cityUexId !== null && !knownCities.has(cityUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown city ${cityUexId} — stored as null`,
            rawPayload: { poi_id: record.id, missing_city_id: cityUexId },
          }),
        );
        cityUexId = null;
      }

      let outpostUexId = record.id_outpost ?? null;
      if (outpostUexId !== null && !knownOutposts.has(outpostUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown outpost ${outpostUexId} — stored as null`,
            rawPayload: { poi_id: record.id, missing_outpost_id: outpostUexId },
          }),
        );
        outpostUexId = null;
      }

      // Warn if no location parent resolved
      if (
        starSystemUexId === null &&
        planetUexId === null &&
        moonUexId === null &&
        orbitUexId === null &&
        spaceStationUexId === null &&
        cityUexId === null &&
        outpostUexId === null
      ) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} has no resolvable location parent`,
            rawPayload: { poi_id: record.id },
          }),
        );
      }

      let factionUexId = record.id_faction ?? null;
      if (factionUexId !== null && !knownFactions.has(factionUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown faction ${factionUexId} — stored as null`,
            rawPayload: { poi_id: record.id, missing_faction_id: factionUexId },
          }),
        );
        factionUexId = null;
      }

      let jurisdictionUexId = record.id_jurisdiction ?? null;
      if (
        jurisdictionUexId !== null &&
        !knownJurisdictions.has(jurisdictionUexId)
      ) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `POI ${record.id} references unknown jurisdiction ${jurisdictionUexId} — stored as null`,
            rawPayload: {
              poi_id: record.id,
              missing_jurisdiction_id: jurisdictionUexId,
            },
          }),
        );
        jurisdictionUexId = null;
      }

      await this.dataSource.query(
        `INSERT INTO station_poi
           (uex_id, star_system_uex_id, planet_uex_id, moon_uex_id, orbit_uex_id,
            space_station_uex_id, city_uex_id, outpost_uex_id,
            faction_uex_id, jurisdiction_uex_id,
            name, nickname, subtype,
            is_available, is_available_live, is_visible, is_default,
            is_monitored, is_armistice, is_landable, is_decommissioned,
            has_quantum_marker, has_trade_terminal, has_habitation, has_refinery,
            has_cargo_center, has_clinic, has_food, has_shops, has_refuel, has_repair,
            has_gravity, has_loading_dock, has_docking_port, has_freight_elevator,
            pad_types,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                 $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           star_system_uex_id=EXCLUDED.star_system_uex_id,
           planet_uex_id=EXCLUDED.planet_uex_id,
           moon_uex_id=EXCLUDED.moon_uex_id,
           orbit_uex_id=EXCLUDED.orbit_uex_id,
           space_station_uex_id=EXCLUDED.space_station_uex_id,
           city_uex_id=EXCLUDED.city_uex_id,
           outpost_uex_id=EXCLUDED.outpost_uex_id,
           faction_uex_id=EXCLUDED.faction_uex_id,
           jurisdiction_uex_id=EXCLUDED.jurisdiction_uex_id,
           name=EXCLUDED.name,
           nickname=EXCLUDED.nickname,
           subtype=EXCLUDED.subtype,
           is_available=EXCLUDED.is_available,
           is_available_live=EXCLUDED.is_available_live,
           is_visible=EXCLUDED.is_visible,
           is_default=EXCLUDED.is_default,
           is_monitored=EXCLUDED.is_monitored,
           is_armistice=EXCLUDED.is_armistice,
           is_landable=EXCLUDED.is_landable,
           is_decommissioned=EXCLUDED.is_decommissioned,
           has_quantum_marker=EXCLUDED.has_quantum_marker,
           has_trade_terminal=EXCLUDED.has_trade_terminal,
           has_habitation=EXCLUDED.has_habitation,
           has_refinery=EXCLUDED.has_refinery,
           has_cargo_center=EXCLUDED.has_cargo_center,
           has_clinic=EXCLUDED.has_clinic,
           has_food=EXCLUDED.has_food,
           has_shops=EXCLUDED.has_shops,
           has_refuel=EXCLUDED.has_refuel,
           has_repair=EXCLUDED.has_repair,
           has_gravity=EXCLUDED.has_gravity,
           has_loading_dock=EXCLUDED.has_loading_dock,
           has_docking_port=EXCLUDED.has_docking_port,
           has_freight_elevator=EXCLUDED.has_freight_elevator,
           pad_types=EXCLUDED.pad_types,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          starSystemUexId,
          planetUexId,
          moonUexId,
          orbitUexId,
          spaceStationUexId,
          cityUexId,
          outpostUexId,
          factionUexId,
          jurisdictionUexId,
          record.name,
          record.nickname ?? null,
          record.subtype ?? null,
          Boolean(record.is_available),
          Boolean(record.is_available_live),
          Boolean(record.is_visible),
          Boolean(record.is_default),
          Boolean(record.is_monitored),
          Boolean(record.is_armistice),
          Boolean(record.is_landable),
          Boolean(record.is_decommissioned),
          Boolean(record.has_quantum_marker),
          Boolean(record.has_trade_terminal),
          Boolean(record.has_habitation),
          Boolean(record.has_refinery),
          Boolean(record.has_cargo_center),
          Boolean(record.has_clinic),
          Boolean(record.has_food),
          Boolean(record.has_shops),
          Boolean(record.has_refuel),
          Boolean(record.has_repair),
          Boolean(record.has_gravity),
          Boolean(record.has_loading_dock),
          Boolean(record.has_docking_port),
          Boolean(record.has_freight_elevator),
          parsePadTypes(record.pad_types),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    this.logger.info({ runId: ctx.runId }, 'pois-sync step complete');
  }
}
