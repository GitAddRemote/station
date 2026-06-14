import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ContractPartyRole } from '../entities/contract-party.entity';

export class AddContractPartyDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  orgId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  businessUnitId?: string | null;

  @ApiProperty({ enum: ContractPartyRole })
  @IsEnum(ContractPartyRole)
  role!: ContractPartyRole;
}
