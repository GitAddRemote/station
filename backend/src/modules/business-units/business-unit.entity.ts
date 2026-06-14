import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export type BusinessUnitKind =
  | 'division'
  | 'department'
  | 'team'
  | 'squad'
  | 'wing'
  | 'custom';

@Entity('org_business_unit')
@Index(['organizationId'])
@Index(['organizationId', 'parentId'])
export class BusinessUnit {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId!: string | null;

  @ManyToOne(() => BusinessUnit, (bu) => bu.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: BusinessUnit | null;

  @OneToMany(() => BusinessUnit, (bu) => bu.parent)
  children!: BusinessUnit[];

  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  kind!: BusinessUnitKind;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
