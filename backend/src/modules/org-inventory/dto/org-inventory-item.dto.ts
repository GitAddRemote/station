import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  Min,
  Max,
  IsInt,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationPairRequired } from '../../../common/decorators/location-pair.decorator';

export class OrgInventoryItemDto {
  id!: string;
  orgId!: number;
  gameId!: number;
  uexItemId!: number;
  quantity!: number;
  unitOfMeasure!: 'unit' | 'scu' | 'uscu';
  quality?: number | null;
  locationType?: string | null;
  locationUexId?: number | null;
  notes?: string;
  active!: boolean;
  dateAdded!: Date;
  dateModified!: Date;
  addedBy!: number;
  modifiedBy!: number;

  // Populated from relations
  itemName?: string;
  orgName?: string;
  addedByUsername?: string;
  modifiedByUsername?: string;
  categoryName?: string;
}

@LocationPairRequired()
export class CreateOrgInventoryItemDto {
  @ApiPropertyOptional({
    description: 'Organization ID (auto-filled from route)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  orgId?: number;

  @ApiProperty({ description: 'Game ID', example: 1 })
  @IsInt()
  gameId!: number;

  @ApiProperty({ description: 'UEX Item ID', example: 100 })
  @IsInt()
  uexItemId!: number;

  @ApiProperty({ description: 'Quantity', example: 100.5, minimum: 0.000001 })
  @IsNumber()
  @Min(0.000001)
  @Max(999999.999999)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    enum: ['unit', 'scu', 'uscu'],
    example: 'unit',
  })
  @IsOptional()
  @IsIn(['unit', 'scu', 'uscu'])
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';

  @ApiPropertyOptional({
    description: 'Item quality (0–32767)',
    example: 90,
    minimum: 0,
    maximum: 32767,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  quality?: number;

  @ApiPropertyOptional({
    description: 'Location type (e.g. city, space_station)',
    example: 'space_station',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  locationType?: string;

  @ApiPropertyOptional({
    description: 'UEX ID of the location entity',
    example: 42,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  locationUexId?: number;

  @ApiPropertyOptional({
    description: 'Optional notes',
    example: 'Org purchased from auction',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  allowDuplicate?: boolean;
}

@LocationPairRequired()
export class UpdateOrgInventoryItemDto {
  @ApiPropertyOptional({
    description: 'Quantity',
    example: 150,
    minimum: 0.000001,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  @Max(999999.999999)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    enum: ['unit', 'scu', 'uscu'],
    example: 'scu',
  })
  @IsOptional()
  @IsIn(['unit', 'scu', 'uscu'])
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';

  @ApiPropertyOptional({
    description: 'Item quality (0–32767)',
    example: 85,
    minimum: 0,
    maximum: 32767,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  quality?: number | null;

  @ApiPropertyOptional({
    description: 'Location type',
    example: 'city',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  locationType?: string | null;

  @ApiPropertyOptional({
    description: 'UEX ID of the location entity',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  locationUexId?: number | null;

  @ApiPropertyOptional({
    description: 'Optional notes',
    example: 'Updated notes',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class OrgInventorySearchDto {
  @ApiProperty({ description: 'Organization ID (from route)', example: 1 })
  @IsInt()
  orgId!: number;

  @ApiProperty({ description: 'Game ID (required)', example: 1 })
  @IsInt()
  gameId!: number;

  @ApiPropertyOptional({
    description: 'Minimum quantity filter',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({
    description: 'Maximum quantity filter',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxQuantity?: number;

  @ApiPropertyOptional({
    description: 'Minimum quality filter',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  minQuality?: number;

  @ApiPropertyOptional({
    description: 'Maximum quality filter',
    example: 100,
    minimum: 0,
    maximum: 32767,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  maxQuality?: number;

  @ApiPropertyOptional({
    description: 'Filter by unit of measure',
    enum: ['unit', 'scu', 'uscu'],
    example: 'scu',
  })
  @IsOptional()
  @IsIn(['unit', 'scu', 'uscu'])
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';

  @ApiPropertyOptional({ description: 'Filter by UEX Item ID', example: 100 })
  @IsOptional()
  @IsInt()
  uexItemId?: number;

  @ApiPropertyOptional({
    description: 'Filter by UEX category ID',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Search by item name or notes',
    example: 'Prospector',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter for active items only',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Sort column',
    example: 'date_modified',
    enum: ['name', 'quantity', 'quality', 'date_added', 'date_modified'],
  })
  @IsOptional()
  @IsIn(['name', 'quantity', 'quality', 'date_added', 'date_modified'])
  sort?: 'name' | 'quantity' | 'quality' | 'date_added' | 'date_modified';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 50,
    minimum: 1,
    maximum: 500,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of results to skip (for pagination)',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class OrgInventorySummaryAggregateRow {
  uexItemId!: number;
  unitOfMeasure!: string;
  totalQuantity!: number;
  itemCount!: number;
  latestUpdate!: Date | null;
}

export class OrgInventorySummaryDto {
  orgId!: number;
  aggregates!: OrgInventorySummaryAggregateRow[];
}
