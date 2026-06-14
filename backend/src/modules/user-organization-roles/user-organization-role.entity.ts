import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';
import { BusinessUnit } from '../business-units/business-unit.entity';

@Entity()
@Index(['userId', 'organizationId'])
@Index(['organizationId', 'roleId'])
@Index(['userId', 'roleId'])
@Index(['userId', 'organizationId', 'roleId'], { unique: true })
export class UserOrganizationRole {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' }) // Don't delete roles if in use
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @Column({ type: 'uuid', nullable: true, name: 'business_unit_id' })
  businessUnitId!: string | null;

  @ManyToOne(() => BusinessUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'business_unit_id' })
  businessUnit!: BusinessUnit | null;

  @Column({ name: 'org_priority', type: 'integer', default: 0 })
  orgPriority!: number;

  @CreateDateColumn()
  assignedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
