import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Contract } from './contract.entity';
import { User } from '../../users/user.entity';

@Entity({ name: 'contract_status_history' })
@Index('idx_csh_contract_id', ['contractId', 'changedAt'])
@Index('idx_csh_changed_by', ['changedBy'])
export class ContractStatusHistory {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId!: string;

  @ManyToOne(() => Contract, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column({ name: 'from_status', type: 'varchar', length: 50, nullable: true })
  fromStatus!: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 50 })
  toStatus!: string;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changed_by' })
  changedByUser!: User;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;

  @Column({ type: 'text', nullable: true })
  note!: string | null;
}
