import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('oauth_clients')
export class OauthClient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  clientId!: string;

  @Column()
  clientSecretHash!: string;

  @Column('simple-array')
  scopes!: string[];

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
