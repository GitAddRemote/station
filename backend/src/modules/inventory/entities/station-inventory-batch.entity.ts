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
import { StationLocation } from '../../locations/entities/station-location.entity';
import { StationInventoryItem } from './station-inventory-item.entity';

@Entity({ name: 'station_inventory_batch' })
@Index('idx_station_inventory_batch_owner', ['ownerType', 'ownerId'])
@Index('idx_station_inventory_batch_location_id', ['locationId'])
export class StationInventoryBatch {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 10 })
  ownerType!: 'user' | 'org';

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => StationLocation, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  location!: StationLocation;

  @OneToMany(() => StationInventoryItem, (item) => item.batch)
  items!: StationInventoryItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
