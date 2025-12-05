import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Game } from '../../games/game.entity';
import { UexStarSystem } from '../../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../../uex/entities/uex-planet.entity';
import { UexMoon } from '../../uex/entities/uex-moon.entity';
import { UexCity } from '../../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../../uex/entities/uex-outpost.entity';
import { UexPoi } from '../../uex/entities/uex-poi.entity';
import { User } from '../../users/user.entity';

export enum LocationType {
  STAR_SYSTEM = 'star_system',
  PLANET = 'planet',
  MOON = 'moon',
  CITY = 'city',
  SPACE_STATION = 'space_station',
  OUTPOST = 'outpost',
  POI = 'poi',
}

@Entity('locations')
@Index('idx_locations_game', ['gameId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_locations_type', ['locationType', 'gameId'], {
  where: 'deleted = FALSE',
})
@Index('idx_locations_star_system', ['starSystemId'], {
  where: 'deleted = FALSE AND star_system_id IS NOT NULL',
})
@Index('idx_locations_planet', ['planetId'], {
  where: 'deleted = FALSE AND planet_id IS NOT NULL',
})
@Index('idx_locations_city', ['cityId'], {
  where: 'deleted = FALSE AND city_id IS NOT NULL',
})
@Check(`
  (location_type = 'star_system' AND star_system_id IS NOT NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
  (location_type = 'planet' AND star_system_id IS NULL AND planet_id IS NOT NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
  (location_type = 'moon' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NOT NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
  (location_type = 'city' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NOT NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
  (location_type = 'space_station' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NOT NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
  (location_type = 'outpost' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NOT NULL AND poi_id IS NULL) OR
  (location_type = 'poi' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NOT NULL)
`)
export class Location {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'game_id', type: 'integer' })
  gameId!: number;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'game_id' })
  game!: Game;

  @Column({
    name: 'location_type',
    type: 'varchar',
    length: 50,
    enum: LocationType,
  })
  locationType!: LocationType;

  // Polymorphic FKs - only one should be non-null based on type
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

  @Column({ name: 'city_id', type: 'integer', nullable: true })
  cityId?: number;

  @ManyToOne(() => UexCity, { nullable: true })
  @JoinColumn({ name: 'city_id', referencedColumnName: 'uexId' })
  city?: UexCity;

  @Column({ name: 'space_station_id', type: 'integer', nullable: true })
  spaceStationId?: number;

  @ManyToOne(() => UexSpaceStation, { nullable: true })
  @JoinColumn({ name: 'space_station_id', referencedColumnName: 'uexId' })
  spaceStation?: UexSpaceStation;

  @Column({ name: 'outpost_id', type: 'integer', nullable: true })
  outpostId?: number;

  @ManyToOne(() => UexOutpost, { nullable: true })
  @JoinColumn({ name: 'outpost_id', referencedColumnName: 'uexId' })
  outpost?: UexOutpost;

  @Column({ name: 'poi_id', type: 'integer', nullable: true })
  poiId?: number;

  @ManyToOne(() => UexPoi, { nullable: true })
  @JoinColumn({ name: 'poi_id', referencedColumnName: 'uexId' })
  poi?: UexPoi;

  // Denormalized display fields for performance
  @Column({ name: 'display_name', length: 500 })
  displayName!: string;

  @Column({ name: 'short_name', length: 255 })
  shortName!: string;

  @Column({ name: 'hierarchy_path', type: 'text', nullable: true })
  hierarchyPath?: string; // JSON string: {"system": "STANTON", "planet": "CRUSADER", "city": "Orison"}

  // Metadata
  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @Column({ name: 'is_landable', nullable: true })
  isLandable?: boolean; // Only relevant for planets/moons

  @Column({ name: 'has_armistice', nullable: true })
  hasArmistice?: boolean; // Only relevant for stations/cities

  @Column({ default: true })
  active!: boolean;

  @Column({ default: false })
  deleted!: boolean;

  @Column({ name: 'date_added', type: 'timestamptz', default: () => 'NOW()' })
  dateAdded!: Date;

  @Column({
    name: 'date_modified',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  dateModified!: Date;

  @Column({ name: 'added_by', type: 'bigint', nullable: true })
  addedById?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'added_by' })
  addedBy?: User;

  @Column({ name: 'modified_by', type: 'bigint', nullable: true })
  modifiedById?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'modified_by' })
  modifiedBy?: User;
}
