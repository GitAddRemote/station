import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseUexEntity } from './base-uex.entity';
import { UexPlanet } from './uex-planet.entity';
import { UexStarSystem } from './uex-star-system.entity';

@Entity('uex_moons')
@Index('idx_uex_moons_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_moons_planet', ['planetId'], { where: 'deleted = FALSE' })
@Index('idx_uex_moons_system', ['starSystemId'], { where: 'deleted = FALSE' })
export class UexMoon extends BaseUexEntity {
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

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50, nullable: true })
  code?: string;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @Column({ name: 'is_landable', default: false })
  isLandable!: boolean;
}
