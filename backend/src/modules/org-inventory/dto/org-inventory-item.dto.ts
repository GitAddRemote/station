import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsInt,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrgInventoryItemDto {
  id!: string;
  orgId!: number;
  gameId!: number;
  uexItemId!: number;
  locationId!: number;
  quantity!: number;
  notes?: string;
  active!: boolean;
  dateAdded!: Date;
  dateModified!: Date;
  addedBy!: number;
  modifiedBy!: number;

  // Populated from relations
  itemName?: string;
  locationName?: string;
  orgName?: string;
  addedByUsername?: string;
  modifiedByUsername?: string;
  categoryName?: string;
}

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

  @ApiProperty({ description: 'Location ID', example: 200 })
  @IsInt()
  locationId!: number;

  @ApiProperty({ description: 'Quantity', example: 100.5, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Max(999999999.99)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Optional notes',
    example: 'Org purchased from auction',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateOrgInventoryItemDto {
  @ApiPropertyOptional({ description: 'Location ID', example: 300 })
  @IsOptional()
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional({ description: 'Quantity', example: 150, minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999999.99)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Optional notes',
    example: 'Moved to new location',
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

  @ApiPropertyOptional({ description: 'Filter by Location ID', example: 200 })
  @IsOptional()
  @IsInt()
  locationId?: number;

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
    enum: ['name', 'quantity', 'location', 'date_added', 'date_modified'],
  })
  @IsOptional()
  @IsString()
  sort?: 'name' | 'quantity' | 'location' | 'date_added' | 'date_modified';

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

export class OrgInventorySummaryDto {
  orgId!: number;
  gameId!: number;
  totalItems!: number;
  uniqueItems!: number;
  locationCount!: number;
  lastUpdated!: Date;
}
