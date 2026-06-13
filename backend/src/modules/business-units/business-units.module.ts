import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessUnit } from './business-unit.entity';
import { BusinessUnitsService } from './business-units.service';
import { BusinessUnitsController } from './business-units.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessUnit])],
  providers: [BusinessUnitsService],
  controllers: [BusinessUnitsController],
  exports: [BusinessUnitsService],
})
export class BusinessUnitsModule {}
