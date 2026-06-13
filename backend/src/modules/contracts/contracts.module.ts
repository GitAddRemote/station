import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StationInventoryItem } from '../inventory/entities/station-inventory-item.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractItem } from './entities/contract-item.entity';
import { ContractMilestone } from './entities/contract-milestone.entity';
import { ContractParty } from './entities/contract-party.entity';
import { ContractStatusHistory } from './entities/contract-status-history.entity';
import { Contract } from './entities/contract.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contract,
      ContractMilestone,
      ContractParty,
      ContractItem,
      ContractStatusHistory,
      StationInventoryItem,
    ]),
    PermissionsModule,
    AuditLogsModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [TypeOrmModule, ContractsService],
})
export class ContractsModule {}
