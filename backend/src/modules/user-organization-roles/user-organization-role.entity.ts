import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';

@Entity()
@Index(['userId', 'organizationId']) // Critical for "get user's roles in org"
@Index(['organizationId', 'roleId']) // For "get all users with role X in org Y"
@Index(['userId', 'roleId']) // For "get all orgs where user has role X"
@Index(['userId', 'organizationId', 'roleId'], { unique: true }) // Prevent duplicate role assignments
export class UserOrganizationRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  organizationId!: number;

  @Column()
  roleId!: number;

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
