import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexVehicle {
  id: number;
  uuid: string | null;
  id_company: number | null;
  id_parent: number | null;
  name: string;
  name_full: string | null;
  slug: string | null;
  crew: string | null;
  career: string | null;
  role: string | null;
  size: string | null;
  mass: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  scu: number | null;
  fuel_quantum: number | null;
  fuel_hydrogen: number | null;
  container_sizes: number[] | null;
  pad_type: string | null;
  is_addon: number;
  is_boarding: number;
  is_bomber: number;
  is_cargo: number;
  is_carrier: number;
  is_civilian: number;
  is_concept: number;
  is_construction: number;
  is_datarunner: number;
  is_docking: number;
  is_emp: number;
  is_exploration: number;
  is_ground_vehicle: number;
  is_hangar: number;
  is_industrial: number;
  is_interdiction: number;
  is_loading_dock: number;
  is_medical: number;
  is_military: number;
  is_mining: number;
  is_passenger: number;
  is_qed: number;
  is_racing: number;
  is_refinery: number;
  is_refuel: number;
  is_repair: number;
  is_research: number;
  is_salvage: number;
  is_scanning: number;
  is_science: number;
  is_showdown_winner: number;
  is_spaceship: number;
  is_starter: number;
  is_stealth: number;
  is_tractor_beam: number;
  is_quantum_capable: number;
  url_photo: string | null;
  url_store: string | null;
  url_brochure: string | null;
  url_hotsite: string | null;
  url_video: string | null;
  game_version: string | null;
  date_added: number | null;
  date_modified: number | null;
}

interface UexVehicleLoaner {
  id_vehicle: number;
  id_loaner: number;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

function parseCrew(raw: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!raw || raw === 'N/A') return { min: null, max: null };
  const parts = raw.split('-').map(Number);
  if (parts.some(isNaN)) return { min: null, max: null };
  return { min: parts[0], max: parts[1] ?? parts[0] };
}

const VALID_PAD_TYPES = new Set(['XS', 'S', 'M', 'L', 'XL']);

@Injectable()
export class VehiclesSyncStep implements EtlStep {
  readonly name = 'vehicles-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(VehiclesSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const [vehicles, loaners] = await Promise.all([
      this.uexApiClient.get<UexVehicle[]>('/vehicles'),
      this.uexApiClient.get<UexVehicleLoaner[]>('/vehicle_loaners'),
    ]);

    this.logger.info(
      { runId: ctx.runId, vehicles: vehicles.length, loaners: loaners.length },
      'Fetched vehicles and loaners from UEX',
    );

    // Pass 1 — upsert all vehicles
    let upserted = 0;
    let skipped = 0;

    for (const record of vehicles) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Vehicle uex_id=${record.id} has no name — skipped`,
            rawPayload: { id: record.id },
          }),
        );
        skipped++;
        continue;
      }

      const { min: crewMin, max: crewMax } = parseCrew(record.crew ?? null);
      const padType =
        record.pad_type && VALID_PAD_TYPES.has(record.pad_type.toUpperCase())
          ? record.pad_type.toUpperCase()
          : null;

      await this.dataSource.query(
        `INSERT INTO station_vehicle (
           uex_id, uuid, company_uex_id, parent_uex_id,
           name, name_full, slug,
           crew_raw, crew_min, crew_max,
           career, role, size, mass, width, height, length,
           scu, fuel_quantum, fuel_hydrogen,
           container_sizes, pad_type,
           is_addon, is_boarding, is_bomber, is_cargo, is_carrier,
           is_civilian, is_concept, is_construction, is_datarunner,
           is_docking, is_emp, is_exploration, is_ground_vehicle,
           is_hangar, is_industrial, is_interdiction, is_loading_dock,
           is_medical, is_military, is_mining, is_passenger,
           is_qed, is_racing, is_refinery, is_refuel, is_repair,
           is_research, is_salvage, is_scanning, is_science,
           is_showdown_winner, is_spaceship, is_starter, is_stealth,
           is_tractor_beam, is_quantum_capable,
           url_photo, url_store, url_brochure, url_hotsite, url_video,
           game_version, uex_date_added, uex_date_modified, synced_at
         )
         VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
           $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
           $33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,
           $48,$49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60,$61,$62,
           $63,$64,NOW()
         )
         ON CONFLICT (uex_id) DO UPDATE SET
           uuid=EXCLUDED.uuid,
           company_uex_id=EXCLUDED.company_uex_id,
           parent_uex_id=EXCLUDED.parent_uex_id,
           name=EXCLUDED.name,
           name_full=EXCLUDED.name_full,
           slug=EXCLUDED.slug,
           crew_raw=EXCLUDED.crew_raw,
           crew_min=EXCLUDED.crew_min,
           crew_max=EXCLUDED.crew_max,
           career=EXCLUDED.career,
           role=EXCLUDED.role,
           size=EXCLUDED.size,
           mass=EXCLUDED.mass,
           width=EXCLUDED.width,
           height=EXCLUDED.height,
           length=EXCLUDED.length,
           scu=EXCLUDED.scu,
           fuel_quantum=EXCLUDED.fuel_quantum,
           fuel_hydrogen=EXCLUDED.fuel_hydrogen,
           container_sizes=EXCLUDED.container_sizes,
           pad_type=EXCLUDED.pad_type,
           is_addon=EXCLUDED.is_addon,
           is_boarding=EXCLUDED.is_boarding,
           is_bomber=EXCLUDED.is_bomber,
           is_cargo=EXCLUDED.is_cargo,
           is_carrier=EXCLUDED.is_carrier,
           is_civilian=EXCLUDED.is_civilian,
           is_concept=EXCLUDED.is_concept,
           is_construction=EXCLUDED.is_construction,
           is_datarunner=EXCLUDED.is_datarunner,
           is_docking=EXCLUDED.is_docking,
           is_emp=EXCLUDED.is_emp,
           is_exploration=EXCLUDED.is_exploration,
           is_ground_vehicle=EXCLUDED.is_ground_vehicle,
           is_hangar=EXCLUDED.is_hangar,
           is_industrial=EXCLUDED.is_industrial,
           is_interdiction=EXCLUDED.is_interdiction,
           is_loading_dock=EXCLUDED.is_loading_dock,
           is_medical=EXCLUDED.is_medical,
           is_military=EXCLUDED.is_military,
           is_mining=EXCLUDED.is_mining,
           is_passenger=EXCLUDED.is_passenger,
           is_qed=EXCLUDED.is_qed,
           is_racing=EXCLUDED.is_racing,
           is_refinery=EXCLUDED.is_refinery,
           is_refuel=EXCLUDED.is_refuel,
           is_repair=EXCLUDED.is_repair,
           is_research=EXCLUDED.is_research,
           is_salvage=EXCLUDED.is_salvage,
           is_scanning=EXCLUDED.is_scanning,
           is_science=EXCLUDED.is_science,
           is_showdown_winner=EXCLUDED.is_showdown_winner,
           is_spaceship=EXCLUDED.is_spaceship,
           is_starter=EXCLUDED.is_starter,
           is_stealth=EXCLUDED.is_stealth,
           is_tractor_beam=EXCLUDED.is_tractor_beam,
           is_quantum_capable=EXCLUDED.is_quantum_capable,
           url_photo=EXCLUDED.url_photo,
           url_store=EXCLUDED.url_store,
           url_brochure=EXCLUDED.url_brochure,
           url_hotsite=EXCLUDED.url_hotsite,
           url_video=EXCLUDED.url_video,
           game_version=EXCLUDED.game_version,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id, // $1  uex_id
          record.uuid ?? null, // $2  uuid
          record.id_company ?? null, // $3  company_uex_id
          record.id_parent ?? null, // $4  parent_uex_id
          record.name, // $5  name
          record.name_full ?? null, // $6  name_full
          record.slug ?? null, // $7  slug
          record.crew ?? null, // $8  crew_raw
          crewMin, // $9  crew_min
          crewMax, // $10 crew_max
          record.career ?? null, // $11 career
          record.role ?? null, // $12 role
          record.size ?? null, // $13 size
          record.mass ?? null, // $14 mass
          record.width ?? null, // $15 width
          record.height ?? null, // $16 height
          record.length ?? null, // $17 length
          record.scu ?? null, // $18 scu
          record.fuel_quantum ?? null, // $19 fuel_quantum
          record.fuel_hydrogen ?? null, // $20 fuel_hydrogen
          record.container_sizes ?? null, // $21 container_sizes
          padType, // $22 pad_type
          Boolean(record.is_addon), // $23
          Boolean(record.is_boarding), // $24
          Boolean(record.is_bomber), // $25
          Boolean(record.is_cargo), // $26
          Boolean(record.is_carrier), // $27
          Boolean(record.is_civilian), // $28
          Boolean(record.is_concept), // $29
          Boolean(record.is_construction), // $30
          Boolean(record.is_datarunner), // $31
          Boolean(record.is_docking), // $32
          Boolean(record.is_emp), // $33
          Boolean(record.is_exploration), // $34
          Boolean(record.is_ground_vehicle), // $35
          Boolean(record.is_hangar), // $36
          Boolean(record.is_industrial), // $37
          Boolean(record.is_interdiction), // $38
          Boolean(record.is_loading_dock), // $39
          Boolean(record.is_medical), // $40
          Boolean(record.is_military), // $41
          Boolean(record.is_mining), // $42
          Boolean(record.is_passenger), // $43
          Boolean(record.is_qed), // $44
          Boolean(record.is_racing), // $45
          Boolean(record.is_refinery), // $46
          Boolean(record.is_refuel), // $47
          Boolean(record.is_repair), // $48
          Boolean(record.is_research), // $49
          Boolean(record.is_salvage), // $50
          Boolean(record.is_scanning), // $51
          Boolean(record.is_science), // $52
          Boolean(record.is_showdown_winner), // $53
          Boolean(record.is_spaceship), // $54
          Boolean(record.is_starter), // $55
          Boolean(record.is_stealth), // $56
          Boolean(record.is_tractor_beam), // $57
          Boolean(record.is_quantum_capable), // $58
          record.url_photo ?? null, // $59
          record.url_store ?? null, // $60
          record.url_brochure ?? null, // $61
          record.url_hotsite ?? null, // $62
          record.url_video ?? null, // $63
          record.game_version ?? null, // $64
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
      upserted++;
    }

    this.logger.info(
      { runId: ctx.runId, upserted, skipped },
      'vehicles upserted',
    );

    // Pass 2 — upsert vehicle loaners (vehicles must exist first)
    let loanerUpserted = 0;
    let loanerSkipped = 0;

    for (const record of loaners) {
      const originId = record.id_vehicle;
      const loanerId = record.id_loaner;

      // Verify both sides exist (FK references uex_id which may not be in our set)
      const [exists] = await this.dataSource.query<{ c: string }[]>(
        `SELECT COUNT(*) AS c FROM station_vehicle
         WHERE uex_id IN ($1, $2)`,
        [originId, loanerId],
      );
      if (parseInt(exists.c) < 2) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Vehicle loaner references unknown vehicle uex_id — skipped (vehicle=${originId}, loaner=${loanerId})`,
            rawPayload: { id_vehicle: originId, id_loaner: loanerId },
          }),
        );
        loanerSkipped++;
        continue;
      }

      await this.dataSource.query(
        `INSERT INTO station_vehicle_loaner (vehicle_uex_id, loaner_uex_id)
         VALUES ($1, $2)
         ON CONFLICT (vehicle_uex_id, loaner_uex_id) DO NOTHING`,
        [originId, loanerId],
      );
      loanerUpserted++;
    }

    this.logger.info(
      { runId: ctx.runId, loanerUpserted, loanerSkipped },
      'vehicle loaners upserted',
    );
  }
}
