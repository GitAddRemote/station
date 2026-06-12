import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ContractRisk, ContractType } from '../entities/contract.entity';
import {
  ContractItemSubtype,
  VehicleSubtype,
} from '../entities/contract-item.entity';

export class CreateContractItemDto {
  @ApiProperty({ enum: ContractItemSubtype })
  @IsEnum(ContractItemSubtype)
  itemSubtype!: ContractItemSubtype;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  catalogEntryId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  pickupLocationId?: string | null;

  @ApiPropertyOptional({ minimum: 0.0001 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quality?: number | null;

  @ApiPropertyOptional({ enum: VehicleSubtype })
  @IsOptional()
  @IsEnum(VehicleSubtype)
  vehicleSubtype?: VehicleSubtype | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateContractMilestoneDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateContractDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType)
  type!: ContractType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orgId!: string;

  @ApiPropertyOptional({ enum: ContractRisk })
  @IsOptional()
  @IsEnum(ContractRisk)
  risk?: ContractRisk | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rewardAuec?: number | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  deliveryLocationId?: string | null;

  @ApiPropertyOptional({ type: 'object', nullable: true })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [CreateContractItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractItemDto)
  items?: CreateContractItemDto[];

  @ApiPropertyOptional({ type: [CreateContractMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractMilestoneDto)
  milestones?: CreateContractMilestoneDto[];
}
