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

@Entity('uex_moons')
@Index('idx_uex_moons_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_moons_planet', ['planetId'], { where: 'deleted = FALSE' })
export class UexMoon extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'planet_id', type: 'integer' })
  planetId!: number;

  @ManyToOne(() => UexPlanet)
  @JoinColumn({ name: 'planet_id', referencedColumnName: 'uexId' })
  planet!: UexPlanet;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50, nullable: true })
  code?: string;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @Column({ name: 'is_landable', default: false })
  isLandable!: boolean;
}
