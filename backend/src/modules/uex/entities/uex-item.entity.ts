import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseUexEntity } from './base-uex.entity';
import { UexCategory } from './uex-category.entity';
import { UexCompany } from './uex-company.entity';

@Entity('uex_items')
@Index('idx_uex_items_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_items_category', ['idCategory'], { where: 'deleted = FALSE' })
@Index('idx_uex_items_company', ['idCompany'], { where: 'deleted = FALSE' })
@Index('idx_uex_items_sc_uuid', ['starCitizenUuid'], {
  where: 'deleted = FALSE AND star_citizen_uuid IS NOT NULL',
})
@Index('idx_uex_items_search', ['name'], { where: 'deleted = FALSE' })
@Index('idx_uex_items_sync', ['uexDateModified'], { where: 'deleted = FALSE' })
@Index('idx_uex_items_commodity', ['isCommodity'], {
  where: 'deleted = FALSE AND is_commodity = TRUE',
})
export class UexItem extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'star_citizen_uuid', length: 255, nullable: true })
  starCitizenUuid?: string;

  @Column({ name: 'id_category', type: 'integer', nullable: true })
  idCategory?: number;

  @ManyToOne(() => UexCategory, { nullable: true })
  @JoinColumn({ name: 'id_category', referencedColumnName: 'uexId' })
  category?: UexCategory;

  @Column({ name: 'id_company', type: 'integer', nullable: true })
  idCompany?: number;

  @ManyToOne(() => UexCompany, { nullable: true })
  @JoinColumn({ name: 'id_company', referencedColumnName: 'uexId' })
  company?: UexCompany;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 100, nullable: true })
  section?: string;

  @Column({ name: 'category', length: 100, nullable: true })
  categoryName?: string;

  @Column({ name: 'company_name', length: 255, nullable: true })
  companyName?: string;

  @Column({ length: 50, nullable: true })
  size?: string;

  @Column({
    name: 'weight_scu',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  weightScu?: number;

  @Column({ name: 'is_commodity', default: false })
  isCommodity!: boolean;

  @Column({ name: 'is_buyable', default: false })
  isBuyable!: boolean;

  @Column({ name: 'is_sellable', default: false })
  isSellable!: boolean;
}
