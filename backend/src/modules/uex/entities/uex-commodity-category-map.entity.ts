import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StationCatalogCategory } from '../../catalog/entities/station-catalog-category.entity';

@Entity({ name: 'uex_commodity_category_map' })
@Index('uq_uex_commodity_category_map_commodity_uex_id', ['commodityUexId'], {
  unique: true,
})
@Index('idx_uex_commodity_category_map_catalog_category_id', [
  'catalogCategoryId',
])
export class UexCommodityCategoryMap {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'commodity_uex_id', type: 'integer' })
  commodityUexId!: number;

  @Column({ name: 'commodity_name', type: 'varchar', length: 255 })
  commodityName!: string;

  @Column({
    name: 'commodity_kind',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  commodityKind!: string | null;

  @Column({ name: 'catalog_category_id', type: 'uuid' })
  catalogCategoryId!: string;

  @ManyToOne(() => StationCatalogCategory, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'catalog_category_id' })
  catalogCategory!: StationCatalogCategory;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'is_locally_managed', type: 'boolean', default: true })
  isLocallyManaged!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
