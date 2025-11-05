import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';

@Entity()
@Index(['name']) // for role lookups
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string; // 'admin', 'developer', 'viewer', etc.

  @Column('jsonb', { nullable: true })
  permissions?: Record<string, boolean>; // { canEditUsers: true, canDeleteOrg: false }

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => UserOrganizationRole, uor => uor.role)
  userOrganizationRoles!: UserOrganizationRole[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
