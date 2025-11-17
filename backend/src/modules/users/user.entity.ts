import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ length: 100, nullable: true })
  firstName?: string;

  @Column({ length: 100, nullable: true })
  lastName?: string;

  @Column({ length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @OneToMany(() => UserOrganizationRole, (uor) => uor.user)
  userOrganizationRoles!: UserOrganizationRole[];
}
