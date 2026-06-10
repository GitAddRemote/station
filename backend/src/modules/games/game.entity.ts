import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'game' })
export class Game {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 20, unique: true })
  @Index()
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  @Index()
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
