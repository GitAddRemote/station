import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'station_catalog_category' })
@Index('idx_station_catalog_category_parent_id', ['parentId'])
@Index('idx_station_catalog_category_depth', ['depth'])
@Index('idx_station_catalog_category_sort_order', ['sortOrder'])
export class StationCatalogCategory {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => StationCatalogCategory, (category) => category.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: StationCatalogCategory | null;

  @OneToMany(() => StationCatalogCategory, (category) => category.parent)
  children!: StationCatalogCategory[];

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'text', unique: true })
  path!: string;

  @Column({ name: 'path_ids', type: 'uuid', array: true })
  pathIds!: string[];

  @Column({ type: 'integer', default: 0 })
  depth!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_locally_managed', type: 'boolean', default: false })
  isLocallyManaged!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
