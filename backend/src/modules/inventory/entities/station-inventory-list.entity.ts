import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StationInventoryListItem } from './station-inventory-list-item.entity';

@Entity({ name: 'station_inventory_list' })
@Index('idx_station_inventory_list_owner', ['ownerType', 'ownerId'])
export class StationInventoryList {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 10 })
  ownerType!: 'user' | 'org';

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'is_shared', type: 'boolean', default: false })
  isShared!: boolean;

  @OneToMany(() => StationInventoryListItem, (item) => item.list)
  items!: StationInventoryListItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
