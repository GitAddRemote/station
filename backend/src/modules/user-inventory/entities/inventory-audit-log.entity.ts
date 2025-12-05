import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Organization } from '../../organizations/organization.entity';
import { UserInventoryItem } from './user-inventory-item.entity';

@Entity('inventory_audit_log')
@Index('idx_inv_audit_user', ['userId', 'dateCreated'])
@Index('idx_inv_audit_org', ['orgId', 'dateCreated'])
@Index('idx_inv_audit_type', ['eventType', 'dateCreated'])
@Index('idx_inv_audit_item', ['inventoryItemId', 'dateCreated'], {
  where: 'inventory_item_id IS NOT NULL',
})
export class InventoryAuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'event_type', length: 100 })
  eventType!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'org_id', type: 'integer', nullable: true })
  orgId?: number;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization;

  @Column({ name: 'inventory_item_id', type: 'uuid', nullable: true })
  inventoryItemId?: string;

  @ManyToOne(() => UserInventoryItem, { nullable: true })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem?: UserInventoryItem;

  @Column({ name: 'records_affected', type: 'integer', nullable: true })
  recordsAffected?: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'date_created', type: 'timestamptz' })
  dateCreated!: Date;
}
