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

@Entity('org_inventory_items')
@Index('idx_org_inv_org_game', ['orgId', 'gameId', 'deleted'], {
  where: 'deleted = FALSE',
})
@Index('idx_org_inv_item', ['uexItemId'], {
  where: 'deleted = FALSE',
})
@Index('idx_org_inv_location', ['locationId'], {
  where: 'deleted = FALSE',
})
@Index('idx_org_inv_recent', ['orgId', 'dateModified'], {
  where: 'deleted = FALSE',
})
@Index('idx_org_inv_active', ['orgId', 'active'], {
  where: 'deleted = FALSE',
})
export class OrgInventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'bigint' })
  @Index()
  orgId!: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'org_id' })
  org!: Organization;

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
