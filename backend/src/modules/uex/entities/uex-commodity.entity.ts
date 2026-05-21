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

@Entity('uex_commodity')
@Index('idx_uex_commodities_active', ['uexId'], {
  where: 'deleted = FALSE AND active = TRUE',
})
@Index('idx_uex_commodities_category', ['idCategory'], {
  where: 'deleted = FALSE',
})
@Index('idx_uex_commodities_buyable', ['isBuyable'], {
  where: 'deleted = FALSE AND is_buyable = TRUE',
})
@Index('idx_uex_commodities_sellable', ['isSellable'], {
  where: 'deleted = FALSE AND is_sellable = TRUE',
})
@Index('idx_uex_commodities_sync', ['uexDateModified'], {
  where: 'deleted = FALSE',
})
@Index('idx_uex_commodities_name', ['name'], { where: 'deleted = FALSE' })
export class UexCommodity extends BaseUexEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'id_category', type: 'integer', nullable: true })
  idCategory?: number;

  @ManyToOne(() => UexCategory, { nullable: true })
  @JoinColumn({ name: 'id_category', referencedColumnName: 'uexId' })
  category?: UexCategory;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50, nullable: true })
  code?: string;

  @Column({ length: 50, nullable: true })
  kind?: string;

  @Column({ length: 100, nullable: true })
  section?: string;

  @Column({ name: 'is_raw', type: 'boolean', nullable: true, default: false })
  isRaw!: boolean;

  @Column({
    name: 'is_harvestable',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  isHarvestable!: boolean;

  @Column({
    name: 'is_buyable',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  isBuyable!: boolean;

  @Column({
    name: 'is_sellable',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  isSellable!: boolean;

  @Column({
    name: 'is_illegal',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  isIllegal!: boolean;

  @Column({
    name: 'is_fuel',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  isFuel!: boolean;

  @Column({
    name: 'price_buy',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  priceBuy?: number;

  @Column({
    name: 'price_sell',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  priceSell?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  scu?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  mass?: number;

  @Column({ name: 'star_citizen_uuid', length: 255, nullable: true })
  starCitizenUuid?: string;
}
