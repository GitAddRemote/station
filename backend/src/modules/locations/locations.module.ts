import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationDataSource } from './entities/station-data-source.entity';
import { StationLocation } from './entities/station-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StationDataSource, StationLocation])],
  exports: [TypeOrmModule],
})
export class LocationsModule {}
