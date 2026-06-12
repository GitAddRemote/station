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
import { StationCatalogEntry } from '../../catalog/entities/station-catalog-entry.entity';
import { StationLocation } from '../../locations/entities/station-location.entity';
import { StationUnitOfMeasure } from './station-unit-of-measure.entity';

@Entity({ name: 'station_inventory_item' })
@Index('idx_station_inventory_item_owner', ['ownerType', 'ownerId'])
@Index('idx_station_inventory_item_catalog_entry_id', ['catalogEntryId'])
@Index('idx_station_inventory_item_location_id', ['locationId'])
@Index('idx_station_inventory_item_owner_entry', [
  'ownerType',
  'ownerId',
  'catalogEntryId',
])
export class StationInventoryItem {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 10 })
  ownerType!: 'user' | 'org';

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'catalog_entry_id', type: 'uuid' })
  catalogEntryId!: string;

  @ManyToOne(() => StationCatalogEntry, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'catalog_entry_id' })
  catalogEntry!: StationCatalogEntry;

  @Column({ name: 'catalog_kind', type: 'varchar', length: 20 })
  catalogKind!: 'item' | 'commodity' | 'vehicle';

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => StationLocation, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  location!: StationLocation;

  @Column({ name: 'unit_of_measure_id', type: 'uuid' })
  unitOfMeasureId!: string;

  @ManyToOne(() => StationUnitOfMeasure, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'unit_of_measure_id' })
  unitOfMeasure!: StationUnitOfMeasure;

  @Column({ type: 'numeric', precision: 12, scale: 6, default: 1 })
  quantity!: string;

  @Column({ type: 'integer', nullable: true })
  quality!: number | null;

  @Column({ name: 'is_org_available', type: 'boolean', default: false })
  isOrgAvailable!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  alias!: string | null;

  @Column({ name: 'effective_properties', type: 'jsonb', nullable: true })
  effectiveProperties!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
