import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Exclude()
  @Column({
    name: 'id_uuid',
    type: 'uuid',
    unique: true,
    default: () => 'uuid_generate_v7()',
  })
  idUuid!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  @Index()
  isSystemUser!: boolean;

  @Column({ length: 100, nullable: true })
  firstName?: string;

  @Column({ length: 100, nullable: true })
  lastName?: string;

  @Column({ length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Index()
  @Column({ type: 'varchar', nullable: true, unique: true })
  discordId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  discordAvatarUrl?: string | null;

  @Column({ name: 'password_change_required', default: false })
  passwordChangeRequired!: boolean;

  @Column({ name: 'password_expires_at', type: 'timestamptz', nullable: true })
  passwordExpiresAt?: Date | null;

  @OneToMany(() => UserOrganizationRole, (uor) => uor.user)
  userOrganizationRoles!: UserOrganizationRole[];
}
