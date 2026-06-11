import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexOutpost {
  id: number;
  id_star_system: number | null;
  id_planet: number | null;
  id_moon: number | null;
  id_orbit: number | null;
  id_faction: number | null;
  id_jurisdiction: number | null;
  name: string;
  nickname: string | null;
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

interface StoredOutpost {
  uex_id: number;
  star_system_uex_id: number | null;
  planet_uex_id: number | null;
  moon_uex_id: number | null;
  orbit_uex_id: number | null;
  faction_uex_id: number | null;
  jurisdiction_uex_id: number | null;
  name: string;
  is_available: boolean;
  is_available_live: boolean;
  is_visible: boolean;
  is_default: boolean;
  is_monitored: boolean;
  is_armistice: boolean;
  is_landable: boolean;
  is_decommissioned: boolean;
  has_quantum_marker: boolean;
  has_trade_terminal: boolean;
  has_habitation: boolean;
  has_refinery: boolean;
  has_cargo_center: boolean;
  has_clinic: boolean;
  has_food: boolean;
  has_shops: boolean;
  has_refuel: boolean;
  has_repair: boolean;
  has_gravity: boolean;
  has_loading_dock: boolean;
  has_docking_port: boolean;
  has_freight_elevator: boolean;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

function parsePadTypes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const delimiter = raw.includes('|') ? '|' : ',';
  return raw
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
}

@Injectable()
export class OutpostsSyncStep implements EtlStep {
  readonly name = 'outposts-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(OutpostsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const outposts = await this.uexApiClient.get<UexOutpost[]>('/outposts');
    this.logger.info(
      { runId: ctx.runId, count: outposts.length },
      'Fetched outposts from UEX',
    );

    const [
      starSystemRows,
      planetRows,
      moonRows,
      orbitRows,
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
        `SELECT uex_id FROM station_faction`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_jurisdiction`,
      ),
      this.dataSource.query<StoredOutpost[]>(
        `SELECT uex_id, star_system_uex_id, planet_uex_id, moon_uex_id, orbit_uex_id,
                faction_uex_id, jurisdiction_uex_id, name,
                is_available, is_available_live, is_visible, is_default,
                is_monitored, is_armistice, is_landable, is_decommissioned,
                has_quantum_marker, has_trade_terminal, has_habitation, has_refinery,
                has_cargo_center, has_clinic, has_food, has_shops, has_refuel, has_repair,
                has_gravity, has_loading_dock, has_docking_port, has_freight_elevator
         FROM station_outpost WHERE is_locally_managed = TRUE`,
      ),
    ]);

    const knownStarSystems = new Set(starSystemRows.map((r) => r.uex_id));
    const knownPlanets = new Set(planetRows.map((r) => r.uex_id));
    const knownMoons = new Set(moonRows.map((r) => r.uex_id));
    const knownOrbits = new Set(orbitRows.map((r) => r.uex_id));
    const knownFactions = new Set(factionRows.map((r) => r.uex_id));
    const knownJurisdictions = new Set(jurisdictionRows.map((r) => r.uex_id));
    const locallyManagedByUexId = new Map<number, StoredOutpost>(
      locallyManagedRows.map((r) => [r.uex_id, r]),
    );

    for (const record of outposts) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: 'Outpost missing name',
            rawPayload: { id: record.id },
          }),
        );
        continue;
      }

      const storedOutpost = locallyManagedByUexId.get(record.id);
      if (storedOutpost !== undefined) {
        const drifted: string[] = [];
        if (
          (record.id_star_system ?? null) !== storedOutpost.star_system_uex_id
        )
          drifted.push('id_star_system');
        if ((record.id_planet ?? null) !== storedOutpost.planet_uex_id)
          drifted.push('id_planet');
        if ((record.id_moon ?? null) !== storedOutpost.moon_uex_id)
          drifted.push('id_moon');
        if ((record.id_orbit ?? null) !== storedOutpost.orbit_uex_id)
          drifted.push('id_orbit');
        if ((record.id_faction ?? null) !== storedOutpost.faction_uex_id)
          drifted.push('id_faction');
        if (
          (record.id_jurisdiction ?? null) !== storedOutpost.jurisdiction_uex_id
        )
          drifted.push('id_jurisdiction');
        if (record.name !== storedOutpost.name) drifted.push('name');
        if (Boolean(record.is_available) !== storedOutpost.is_available)
          drifted.push('is_available');
        if (
          Boolean(record.is_available_live) !== storedOutpost.is_available_live
        )
          drifted.push('is_available_live');
        if (Boolean(record.is_visible) !== storedOutpost.is_visible)
          drifted.push('is_visible');
        if (Boolean(record.is_default) !== storedOutpost.is_default)
          drifted.push('is_default');
        if (Boolean(record.is_monitored) !== storedOutpost.is_monitored)
          drifted.push('is_monitored');
        if (Boolean(record.is_armistice) !== storedOutpost.is_armistice)
          drifted.push('is_armistice');
        if (Boolean(record.is_landable) !== storedOutpost.is_landable)
          drifted.push('is_landable');
        if (
          Boolean(record.is_decommissioned) !== storedOutpost.is_decommissioned
        )
          drifted.push('is_decommissioned');
        if (
          Boolean(record.has_quantum_marker) !==
          storedOutpost.has_quantum_marker
        )
          drifted.push('has_quantum_marker');
        if (
          Boolean(record.has_trade_terminal) !==
          storedOutpost.has_trade_terminal
        )
          drifted.push('has_trade_terminal');
        if (Boolean(record.has_habitation) !== storedOutpost.has_habitation)
          drifted.push('has_habitation');
        if (Boolean(record.has_refinery) !== storedOutpost.has_refinery)
          drifted.push('has_refinery');
        if (Boolean(record.has_cargo_center) !== storedOutpost.has_cargo_center)
          drifted.push('has_cargo_center');
        if (Boolean(record.has_clinic) !== storedOutpost.has_clinic)
          drifted.push('has_clinic');
        if (Boolean(record.has_food) !== storedOutpost.has_food)
          drifted.push('has_food');
        if (Boolean(record.has_shops) !== storedOutpost.has_shops)
          drifted.push('has_shops');
        if (Boolean(record.has_refuel) !== storedOutpost.has_refuel)
          drifted.push('has_refuel');
        if (Boolean(record.has_repair) !== storedOutpost.has_repair)
          drifted.push('has_repair');
        if (Boolean(record.has_gravity) !== storedOutpost.has_gravity)
          drifted.push('has_gravity');
        if (Boolean(record.has_loading_dock) !== storedOutpost.has_loading_dock)
          drifted.push('has_loading_dock');
        if (Boolean(record.has_docking_port) !== storedOutpost.has_docking_port)
          drifted.push('has_docking_port');
        if (
          Boolean(record.has_freight_elevator) !==
          storedOutpost.has_freight_elevator
        )
          drifted.push('has_freight_elevator');
        if (drifted.length > 0) {
          await this.warningsRepo.save(
            this.warningsRepo.create({
              runId: ctx.runId,
              stepName: this.name,
              severity: 'warn',
              message: `Outpost uex_id=${record.id} is locally managed but upstream data has drifted — ETL skipped`,
              rawPayload: { id: record.id, drifted_fields: drifted },
            }),
          );
        }
        continue;
      }

      let starSystemUexId = record.id_star_system ?? null;
      if (starSystemUexId !== null && !knownStarSystems.has(starSystemUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Outpost ${record.id} references unknown star system ${starSystemUexId} — stored as null`,
            rawPayload: {
              outpost_id: record.id,
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
            message: `Outpost ${record.id} references unknown planet ${planetUexId} — stored as null`,
            rawPayload: {
              outpost_id: record.id,
              missing_planet_id: planetUexId,
            },
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
            message: `Outpost ${record.id} references unknown moon ${moonUexId} — stored as null`,
            rawPayload: { outpost_id: record.id, missing_moon_id: moonUexId },
          }),
        );
        moonUexId = null;
      }

      // Warn if no location parent resolved at all
      if (planetUexId === null && moonUexId === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Outpost ${record.id} has no resolvable planet or moon parent`,
            rawPayload: {
              outpost_id: record.id,
              id_planet: record.id_planet,
              id_moon: record.id_moon,
            },
          }),
        );
      }

      let orbitUexId = record.id_orbit ?? null;
      if (orbitUexId !== null && !knownOrbits.has(orbitUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Outpost ${record.id} references unknown orbit ${orbitUexId} — stored as null`,
            rawPayload: { outpost_id: record.id, missing_orbit_id: orbitUexId },
          }),
        );
        orbitUexId = null;
      }

      let factionUexId = record.id_faction ?? null;
      if (factionUexId !== null && !knownFactions.has(factionUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Outpost ${record.id} references unknown faction ${factionUexId} — stored as null`,
            rawPayload: {
              outpost_id: record.id,
              missing_faction_id: factionUexId,
            },
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
            message: `Outpost ${record.id} references unknown jurisdiction ${jurisdictionUexId} — stored as null`,
            rawPayload: {
              outpost_id: record.id,
              missing_jurisdiction_id: jurisdictionUexId,
            },
          }),
        );
        jurisdictionUexId = null;
      }

      await this.dataSource.query(
        `INSERT INTO station_outpost
           (uex_id, star_system_uex_id, planet_uex_id, moon_uex_id, orbit_uex_id,
            faction_uex_id, jurisdiction_uex_id,
            name, nickname,
            is_available, is_available_live, is_visible, is_default,
            is_monitored, is_armistice, is_landable, is_decommissioned,
            has_quantum_marker, has_trade_terminal, has_habitation, has_refinery,
            has_cargo_center, has_clinic, has_food, has_shops, has_refuel, has_repair,
            has_gravity, has_loading_dock, has_docking_port, has_freight_elevator,
            pad_types,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                 $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           star_system_uex_id=EXCLUDED.star_system_uex_id,
           planet_uex_id=EXCLUDED.planet_uex_id,
           moon_uex_id=EXCLUDED.moon_uex_id,
           orbit_uex_id=EXCLUDED.orbit_uex_id,
           faction_uex_id=EXCLUDED.faction_uex_id,
           jurisdiction_uex_id=EXCLUDED.jurisdiction_uex_id,
           name=EXCLUDED.name,
           nickname=EXCLUDED.nickname,
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
          factionUexId,
          jurisdictionUexId,
          record.name,
          record.nickname ?? null,
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

    this.logger.info({ runId: ctx.runId }, 'outposts-sync step complete');
  }
}
