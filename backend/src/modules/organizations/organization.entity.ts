import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';
import { Game } from '../games/game.entity';

@Entity()
export class Organization {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ name: 'game_id', type: 'uuid' })
  @Index()
  gameId!: string;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'game_id' })
  game!: Game;

  @OneToMany(() => UserOrganizationRole, (uor) => uor.organization)
  userOrganizationRoles!: UserOrganizationRole[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
