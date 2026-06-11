import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/organization.entity';

@Entity('station_org_guild_mapping')
export class OrgGuildMapping {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Index({ unique: true })
  @Column({ type: 'varchar', name: 'discord_guild_id' })
  discordGuildId!: string;

  @Column({
    type: 'varchar',
    name: 'discord_guild_name_snapshot',
    nullable: true,
  })
  discordGuildNameSnapshot?: string | null;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_validated_at' })
  lastValidatedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
