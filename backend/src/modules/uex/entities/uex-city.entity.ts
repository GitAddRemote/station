import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { BaseUexEntity } from './base-uex.entity';
import { UexPlanet } from './uex-planet.entity';
import { UexMoon } from './uex-moon.entity';

@Entity('uex_cities')
@Index('idx_uex_cities_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_cities_planet', ['planetId'], { where: 'deleted = FALSE' })
@Index('idx_uex_cities_moon', ['moonId'], { where: 'deleted = FALSE' })
@Check(
  `(planet_id IS NOT NULL AND moon_id IS NULL) OR (planet_id IS NULL AND moon_id IS NOT NULL)`,
)
export class UexCity extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

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
