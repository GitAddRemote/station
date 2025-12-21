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

@Entity('uex_orbits')
@Index('idx_uex_orbits_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_orbits_system', ['starSystemId'], { where: 'deleted = FALSE' })
@Index('idx_uex_orbits_code', ['code'], { where: 'deleted = FALSE' })
export class UexOrbit extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'star_system_id', type: 'integer' })
  starSystemId!: number;

  @ManyToOne(() => UexStarSystem)
  @JoinColumn({ name: 'star_system_id', referencedColumnName: 'uexId' })
  starSystem!: UexStarSystem;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50, nullable: true })
  code?: string;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @Column({ name: 'is_visible', default: true })
  isVisible!: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ name: 'is_lagrange', default: false })
  isLagrange!: boolean;

  @Column({ name: 'is_man_made', default: false })
  isManMade!: boolean;

  @Column({ name: 'is_asteroid', default: false })
  isAsteroid!: boolean;

  @Column({ name: 'is_planet', default: false })
  isPlanet!: boolean;

  @Column({ name: 'is_star', default: false })
  isStar!: boolean;

  @Column({ name: 'is_jump_point', default: false })
  isJumpPoint!: boolean;
}
