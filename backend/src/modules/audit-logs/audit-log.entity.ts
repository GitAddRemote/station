import {
  Entity,
  PrimaryGeneratedColumn,
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
}

@Entity()
@Index(['userId'])
@Index(['entityType', 'entityId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  userId?: number;

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

  @Column({ nullable: true })
  entityId?: number;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  oldValues?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  newValues?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
