import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Game } from '../../games/game.entity';
import { UexItem } from '../../uex/entities/uex-item.entity';
import { Location } from '../../locations/entities/location.entity';
import { Organization } from '../../organizations/organization.entity';

@Entity('user_inventory_items')
@Index('idx_user_inv_list', ['userId', 'gameId', 'deleted', 'active'], {
  where: 'deleted = FALSE',
})
@Index('idx_user_inv_org_view', ['sharedOrgId', 'uexItemId'], {
  where: 'deleted = FALSE AND shared_org_id IS NOT NULL',
})
@Index('idx_user_inv_item_agg', ['userId', 'uexItemId', 'deleted'], {
  where: 'deleted = FALSE',
})
@Index('idx_user_inv_recent', ['userId', 'dateModified'], {
  where: 'deleted = FALSE',
})
export class UserInventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  @Index()
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'game_id', type: 'integer' })
  @Index()
  gameId!: number;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'game_id' })
  game!: Game;

  @Column({ name: 'uex_item_id', type: 'integer' })
  @Index()
  uexItemId!: number;

  @ManyToOne(() => UexItem)
  @JoinColumn({ name: 'uex_item_id', referencedColumnName: 'uexId' })
  item!: UexItem;

  @Column({ name: 'location_id', type: 'bigint' })
  @Index()
  locationId!: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'shared_org_id', type: 'bigint', nullable: true })
  @Index()
  sharedOrgId?: number;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'shared_org_id' })
  sharedOrg?: Organization;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: false })
  @Index()
  deleted!: boolean;

  @CreateDateColumn({ name: 'date_added', type: 'timestamptz' })
  dateAdded!: Date;

  @UpdateDateColumn({ name: 'date_modified', type: 'timestamptz' })
  dateModified!: Date;

  @Column({ name: 'added_by', type: 'bigint' })
  addedBy!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'added_by' })
  addedByUser!: User;

  @Column({ name: 'modified_by', type: 'bigint' })
  modifiedBy!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'modified_by' })
  modifiedByUser!: User;
}
