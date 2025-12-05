import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsInt,
} from 'class-validator';

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
}

export class CreateOrgInventoryItemDto {
  @IsInt()
  orgId!: number;

  @IsInt()
  gameId!: number;

  @IsInt()
  uexItemId!: number;

  @IsInt()
  locationId!: number;

  @IsNumber()
  @Min(0.01)
  @Max(999999999.99)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrgInventoryItemDto {
  @IsOptional()
  @IsInt()
  locationId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999999.99)
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class OrgInventorySearchDto {
  @IsInt()
  orgId!: number;

  @IsInt()
  gameId!: number;

  @IsOptional()
  @IsInt()
  uexItemId?: number;

  @IsOptional()
  @IsInt()
  locationId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

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
