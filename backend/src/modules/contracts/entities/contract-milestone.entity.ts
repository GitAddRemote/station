import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Contract } from './contract.entity';

export enum MilestoneState {
  PENDING = 'pending',
  ACTIVE = 'active',
  DONE = 'done',
}

@Entity({ name: 'contract_milestone' })
@Index('idx_contract_milestone_status', ['state'])
export class ContractMilestone {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId!: string;

  @ManyToOne(() => Contract, (contract) => contract.milestones, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'varchar', length: 20, default: MilestoneState.PENDING })
  state!: MilestoneState;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;
}
