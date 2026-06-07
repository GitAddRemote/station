import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StationDataSource } from './station-data-source.entity';

@Entity({ name: 'station_location' })
@Index(
  'uq_station_location_source_namespace',
  ['dataSourceId', 'sourceType', 'sourceId'],
  {
    unique: true,
  },
)
@Index('idx_station_location_data_source_id', ['dataSourceId'])
@Index('idx_station_location_source_type', ['sourceType'])
@Index('idx_station_location_star_system_uex_id', ['starSystemUexId'])
@Index('idx_station_location_planet_uex_id', ['planetUexId'])
@Index('idx_station_location_moon_uex_id', ['moonUexId'])
export class StationLocation {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'data_source_id', type: 'uuid' })
  dataSourceId!: string;

  @ManyToOne(() => StationDataSource, (dataSource) => dataSource.locations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'data_source_id' })
  dataSource!: StationDataSource;

  @Column({ name: 'source_type', type: 'varchar', length: 20 })
  sourceType!: 'city' | 'space_station' | 'outpost' | 'poi' | 'system';

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'star_system_uex_id', type: 'integer', nullable: true })
  starSystemUexId!: number | null;

  @Column({ name: 'planet_uex_id', type: 'integer', nullable: true })
  planetUexId!: number | null;

  @Column({ name: 'moon_uex_id', type: 'integer', nullable: true })
  moonUexId!: number | null;

  @Column({ name: 'is_available_live', type: 'boolean', default: false })
  isAvailableLive!: boolean;

  @Column({ name: 'is_locally_managed', type: 'boolean', default: false })
  isLocallyManaged!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
