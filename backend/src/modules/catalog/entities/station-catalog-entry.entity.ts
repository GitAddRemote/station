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

@Entity({ name: 'station_catalog_entry' })
@Index('idx_station_catalog_entry_category_id', ['categoryId'])
@Index('idx_station_catalog_entry_catalog_kind', ['catalogKind'])
@Index('idx_station_catalog_entry_uex_id', ['uexId'], {
  where: '"uex_id" IS NOT NULL',
})
@Index('idx_station_catalog_entry_is_available_live', ['isAvailableLive'])
@Index('idx_station_catalog_entry_is_illegal', ['isIllegal'], {
  where: '"is_illegal" IS NOT NULL',
})
@Index('idx_station_catalog_entry_is_concept', ['isConcept'], {
  where: '"is_concept" IS NOT NULL',
})
@Index('idx_station_catalog_entry_size', ['size'], {
  where: '"size" IS NOT NULL',
})
@Index('idx_station_catalog_entry_scu', ['scu'], { where: '"scu" IS NOT NULL' })
export class StationCatalogEntry {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => StationCatalogCategory, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: StationCatalogCategory;

  @Column({ name: 'catalog_kind', type: 'varchar', length: 20 })
  catalogKind!: 'item' | 'commodity' | 'vehicle';

  @Column({ name: 'uex_id', type: 'integer', nullable: true })
  uexId!: number | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ name: 'is_available_live', type: 'boolean', default: false })
  isAvailableLive!: boolean;

  @Column({ name: 'is_illegal', type: 'boolean', nullable: true })
  isIllegal!: boolean | null;

  @Column({ name: 'is_concept', type: 'boolean', nullable: true })
  isConcept!: boolean | null;

  @Column({ type: 'smallint', nullable: true })
  size!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  scu!: string | null;

  @Column({ name: 'crew_min', type: 'smallint', nullable: true })
  crewMin!: number | null;

  @Column({ name: 'crew_max', type: 'smallint', nullable: true })
  crewMax!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  mass!: string | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  length!: string | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  width!: string | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  height!: string | null;

  @Column({ name: 'is_locally_managed', type: 'boolean', default: false })
  isLocallyManaged!: boolean;

  @Column({ name: 'base_properties', type: 'jsonb', nullable: true })
  baseProperties!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
