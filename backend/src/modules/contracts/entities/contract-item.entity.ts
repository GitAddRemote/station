import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { StationInventoryItem } from '../../inventory/entities/station-inventory-item.entity';
import { StationLocation } from '../../locations/entities/station-location.entity';

export enum ContractItemSubtype {
  ITEM = 'item',
  COMMODITY = 'commodity',
  VEHICLE = 'vehicle',
}

export enum VehicleSubtype {
  GROUND = 'ground',
  SHIP = 'ship',
}

@Entity({ name: 'contract_item' })
@Index('idx_contract_item_contract_sort', ['contractId', 'sortOrder'])
@Index('idx_contract_item_pickup_location_id', ['pickupLocationId'])
export class ContractItem {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId!: string;

  @ManyToOne(() => Contract, (contract) => contract.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column({ name: 'item_subtype', type: 'varchar', length: 20 })
  itemSubtype!: ContractItemSubtype;

  @Column({ name: 'catalog_entry_id', type: 'uuid', nullable: true })
  catalogEntryId!: string | null;

  @Column({ name: 'inventory_item_id', type: 'uuid', nullable: true })
  inventoryItemId!: string | null;

  @ManyToOne(() => StationInventoryItem, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem!: StationInventoryItem | null;

  @Column({ name: 'pickup_location_id', type: 'uuid', nullable: true })
  pickupLocationId!: string | null;

  @ManyToOne(() => StationLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pickup_location_id' })
  pickupLocation!: StationLocation | null;

  @Column({ type: 'numeric', precision: 15, scale: 4, default: 0 })
  quantity!: string;

  @Column({ type: 'numeric', precision: 7, scale: 4, nullable: true })
  quality!: string | null;

  @Column({
    name: 'vehicle_subtype',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  vehicleSubtype!: VehicleSubtype | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;
}
