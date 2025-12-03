import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
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
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column()
  @Index()
  gameId!: number;

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
