import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
}

export enum AuditEntityType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  ROLE = 'ROLE',
  USER_ORGANIZATION_ROLE = 'USER_ORGANIZATION_ROLE',
  AUTH = 'AUTH',
  CONTRACT = 'CONTRACT',
}

@Entity()
@Index(['userId'])
@Index(['entityType', 'entityId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ nullable: true, type: 'text' })
  userId?: string;

  @Column({ nullable: true })
  username?: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entityType!: AuditEntityType;

  @Column({ nullable: true, type: 'text' })
  entityId?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  oldValues?: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  newValues?: Record<string, unknown>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
