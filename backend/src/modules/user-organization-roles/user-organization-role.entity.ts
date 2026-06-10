import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';

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

  @CreateDateColumn()
  assignedAt!: Date;
}
