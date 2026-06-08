import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { StationInventoryItem } from './station-inventory-item.entity';
import { StationInventoryList } from './station-inventory-list.entity';

@Entity({ name: 'station_inventory_list_item' })
export class StationInventoryListItem {
  @PrimaryColumn({ name: 'list_id', type: 'uuid' })
  listId!: string;

  @ManyToOne(() => StationInventoryList, (list) => list.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'list_id' })
  list!: StationInventoryList;

  @PrimaryColumn({ name: 'inventory_item_id', type: 'uuid' })
  inventoryItemId!: string;

  @ManyToOne(() => StationInventoryItem, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem!: StationInventoryItem;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
