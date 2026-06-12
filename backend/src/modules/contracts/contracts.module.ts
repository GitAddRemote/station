import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { ContractMilestone } from './entities/contract-milestone.entity';
import { ContractParty } from './entities/contract-party.entity';
import { ContractItem } from './entities/contract-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contract,
      ContractMilestone,
      ContractParty,
      ContractItem,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class ContractsModule {}
