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
import { Organization } from '../../organizations/organization.entity';
import { User } from '../../users/user.entity';
import { StationLocation } from '../../locations/entities/station-location.entity';
import { ContractMilestone } from './contract-milestone.entity';
import { ContractParty } from './contract-party.entity';
import { ContractItem } from './contract-item.entity';

export enum ContractType {
  TRANSPORT = 'transport',
  TRANSFER = 'transfer',
  MINING = 'mining',
  SECURITY = 'security',
  SALVAGE = 'salvage',
  MEDICAL = 'medical',
  REFUELING = 'refueling',
}

export enum ContractStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  CLAIMED = 'claimed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export enum ContractRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity({ name: 'contract' })
@Index('idx_contract_org_status', ['orgId', 'status'])
@Index('idx_contract_org_type', ['orgId', 'type'])
@Index('idx_contract_creator_id', ['creatorId'])
export class Contract {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'org_id' })
  org!: Organization;

  @Column({ type: 'varchar', length: 50 })
  type!: ContractType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50, default: ContractStatus.DRAFT })
  status!: ContractStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  risk!: ContractRisk | null;

  @Column({
    name: 'reward_auec',
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  rewardAuec!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadline!: Date | null;

  @Column({ name: 'creator_id', type: 'uuid' })
  creatorId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creator_id' })
  creator!: User;

  @Column({ name: 'delivery_location_id', type: 'uuid', nullable: true })
  deliveryLocationId!: string | null;

  @ManyToOne(() => StationLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivery_location_id' })
  deliveryLocation!: StationLocation | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @OneToMany(() => ContractMilestone, (milestone) => milestone.contract)
  milestones!: ContractMilestone[];

  @OneToMany(() => ContractParty, (party) => party.contract)
  parties!: ContractParty[];

  @OneToMany(() => ContractItem, (item) => item.contract)
  items!: ContractItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
