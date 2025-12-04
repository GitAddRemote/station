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
import { UexMoon } from './uex-moon.entity';

@Entity('uex_outposts')
@Index('idx_uex_outposts_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_outposts_planet', ['planetId'], { where: 'deleted = FALSE' })
@Index('idx_uex_outposts_moon', ['moonId'], { where: 'deleted = FALSE' })
export class UexOutpost extends BaseUexEntity {
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
