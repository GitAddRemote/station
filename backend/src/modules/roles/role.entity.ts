import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';

@Entity()
@Index(['name']) // for role lookups
export class Role {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ unique: true })
  name!: string; // 'admin', 'developer', 'viewer', etc.

  @Column('jsonb', { nullable: true })
  permissions?: Record<string, boolean>; // { canEditUsers: true, canDeleteOrg: false }

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => UserOrganizationRole, (uor) => uor.role)
  userOrganizationRoles!: UserOrganizationRole[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
