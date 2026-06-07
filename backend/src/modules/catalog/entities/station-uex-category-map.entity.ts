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
import { StationCatalogCategory } from './station-catalog-category.entity';

@Entity({ name: 'station_uex_category_map' })
@Index('uq_station_uex_category_map_uex_category_id', ['uexCategoryId'], {
  unique: true,
})
@Index('idx_station_uex_category_map_catalog_category_id', [
  'catalogCategoryId',
])
export class StationUexCategoryMap {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'uex_category_id', type: 'integer' })
  uexCategoryId!: number;

  @Column({ name: 'uex_category_name', type: 'varchar', length: 255 })
  uexCategoryName!: string;

  @Column({
    name: 'uex_category_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  uexCategoryType!: string | null;

  @Column({
    name: 'uex_category_section',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  uexCategorySection!: string | null;

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
