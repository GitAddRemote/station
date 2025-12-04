import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Base abstract entity for all UEX-synced tables
 * Provides common fields for soft-delete, audit tracking, and sync timestamps
 */
export abstract class BaseUexEntity {
  @Column({ name: 'uex_id', type: 'integer', unique: true })
  uexId!: number;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: false })
  deleted!: boolean;

  @CreateDateColumn({ name: 'date_added', type: 'timestamptz' })
  dateAdded!: Date;

  @UpdateDateColumn({ name: 'date_modified', type: 'timestamptz' })
  dateModified!: Date;

  @Column({
    name: 'uex_date_added',
    type: 'timestamptz',
    nullable: true,
  })
  uexDateAdded?: Date;

  @Column({
    name: 'uex_date_modified',
    type: 'timestamptz',
    nullable: true,
  })
  uexDateModified?: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'added_by' })
  addedBy?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'modified_by' })
  modifiedBy?: User;

  @Column({ name: 'added_by', type: 'bigint', nullable: true })
  addedById?: number;

  @Column({ name: 'modified_by', type: 'bigint', nullable: true })
  modifiedById?: number;
}
