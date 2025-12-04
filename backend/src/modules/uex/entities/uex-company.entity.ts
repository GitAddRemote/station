import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseUexEntity } from './base-uex.entity';

@Entity('uex_companies')
@Index('idx_uex_companies_active', ['uexId'], { where: 'deleted = FALSE' })
@Index('idx_uex_companies_code', ['code'], { where: 'deleted = FALSE' })
@Index('idx_uex_companies_sync', ['uexDateModified'], {
  where: 'deleted = FALSE',
})
export class UexCompany extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50, nullable: true })
  code?: string;
}
