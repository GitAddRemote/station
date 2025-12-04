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

@Entity('uex_planets')
@Index('idx_uex_planets_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_planets_system', ['starSystemId'], {
  where: 'deleted = FALSE',
})
export class UexPlanet extends BaseUexEntity {
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

  @Column({ name: 'is_landable', default: false })
  isLandable!: boolean;
}
