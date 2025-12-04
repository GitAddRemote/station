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
import { UexPlanet } from './uex-planet.entity';
import { UexMoon } from './uex-moon.entity';

@Entity('uex_space_stations')
@Index('idx_uex_space_stations_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_space_stations_system', ['starSystemId'], {
  where: 'deleted = FALSE',
})
export class UexSpaceStation extends BaseUexEntity {
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

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50, nullable: true })
  code?: string;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;
}
