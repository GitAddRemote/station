import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseUexEntity } from './base-uex.entity';
import { UexStarSystem } from './uex-star-system.entity';
import { UexOrbit } from './uex-orbit.entity';
import { UexPlanet } from './uex-planet.entity';
import { UexMoon } from './uex-moon.entity';
import { UexSpaceStation } from './uex-space-station.entity';
import { UexCity } from './uex-city.entity';
import { UexOutpost } from './uex-outpost.entity';

@Entity('uex_poi')
@Index('idx_uex_poi_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_poi_system', ['starSystemId'], { where: 'deleted = FALSE' })
@Index('idx_uex_poi_orbit', ['orbitId'], { where: 'deleted = FALSE' })
@Index('idx_uex_poi_station', ['spaceStationId'], { where: 'deleted = FALSE' })
@Index('idx_uex_poi_city', ['cityId'], { where: 'deleted = FALSE' })
@Index('idx_uex_poi_outpost', ['outpostId'], { where: 'deleted = FALSE' })
@Index('idx_uex_poi_type', ['type'], { where: 'deleted = FALSE' })
export class UexPoi extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'star_system_id', type: 'integer', nullable: true })
  starSystemId?: number;

  @ManyToOne(() => UexStarSystem, { nullable: true })
  @JoinColumn({ name: 'star_system_id', referencedColumnName: 'uexId' })
  starSystem?: UexStarSystem;

  @Column({ name: 'planet_id', type: 'integer', nullable: true })
  planetId?: number;

  @ManyToOne(() => UexPlanet, { nullable: true })
  @JoinColumn({ name: 'planet_id', referencedColumnName: 'uexId' })
  planet?: UexPlanet;

  @Column({ name: 'moon_id', type: 'integer', nullable: true })
  moonId?: number;

  @ManyToOne(() => UexMoon, { nullable: true })
  @JoinColumn({ name: 'moon_id', referencedColumnName: 'uexId' })
  moon?: UexMoon;

  @Column({ name: 'orbit_id', type: 'integer', nullable: true })
  orbitId?: number;

  @ManyToOne(() => UexOrbit, { nullable: true })
  @JoinColumn({ name: 'orbit_id', referencedColumnName: 'uexId' })
  orbit?: UexOrbit;

  @Column({ name: 'space_station_id', type: 'integer', nullable: true })
  spaceStationId?: number;

  @ManyToOne(() => UexSpaceStation, { nullable: true })
  @JoinColumn({ name: 'space_station_id', referencedColumnName: 'uexId' })
  spaceStation?: UexSpaceStation;

  @Column({ name: 'city_id', type: 'integer', nullable: true })
  cityId?: number;

  @ManyToOne(() => UexCity, { nullable: true })
  @JoinColumn({ name: 'city_id', referencedColumnName: 'uexId' })
  city?: UexCity;

  @Column({ name: 'outpost_id', type: 'integer', nullable: true })
  outpostId?: number;

  @ManyToOne(() => UexOutpost, { nullable: true })
  @JoinColumn({ name: 'outpost_id', referencedColumnName: 'uexId' })
  outpost?: UexOutpost;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50, nullable: true })
  code?: string;

  @Column({ length: 100, nullable: true })
  type?: string;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;
}
