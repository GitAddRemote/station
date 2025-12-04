import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseUexEntity } from './base-uex.entity';

@Entity('uex_categories')
@Index('idx_uex_categories_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_categories_type', ['type'], { where: 'deleted = FALSE' })
@Index('idx_uex_categories_sync', ['uexDateModified'], {
  where: 'deleted = FALSE',
})
export class UexCategory extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ length: 50, nullable: true })
  type?: string;

  @Column({ length: 100, nullable: true })
  section?: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'is_game_related', default: false })
  isGameRelated!: boolean;
}
