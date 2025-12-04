import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseUexEntity } from './base-uex.entity';

@Entity('uex_star_systems')
@Index('idx_uex_star_systems_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_star_systems_code', ['code'], { where: 'deleted = FALSE' })
export class UexStarSystem extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50 })
  code!: string;

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;
}
