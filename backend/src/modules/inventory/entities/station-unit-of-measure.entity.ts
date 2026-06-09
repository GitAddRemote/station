import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'station_unit_of_measure' })
export class StationUnitOfMeasure {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  abbreviation!: string;

  @Column({ name: 'catalog_kind', type: 'varchar', length: 20, nullable: true })
  catalogKind!: 'item' | 'commodity' | 'vehicle' | null;

  @Column({
    name: 'scale_factor',
    type: 'numeric',
    precision: 18,
    scale: 6,
    default: 1,
  })
  scaleFactor!: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
