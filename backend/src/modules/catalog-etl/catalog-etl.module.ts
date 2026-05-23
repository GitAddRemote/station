import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogEtlService } from './catalog-etl.service';
import { CatalogEtlController } from './catalog-etl.controller';
import { EtlRun } from './entities/etl-run.entity';
import { EtlWarning } from './entities/etl-warning.entity';
import { AdvisoryLockService } from '../../common/services';

@Module({
  imports: [TypeOrmModule.forFeature([EtlRun, EtlWarning])],
  controllers: [CatalogEtlController],
  providers: [CatalogEtlService, AdvisoryLockService],
  exports: [CatalogEtlService],
})
export class CatalogEtlModule {}
