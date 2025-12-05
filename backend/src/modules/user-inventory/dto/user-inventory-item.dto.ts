import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class UserInventoryItemDto {
  id!: string;
  userId!: number;
  gameId!: number;
  uexItemId!: number;
  locationId!: number;
  quantity!: number;
  notes?: string;
  sharedOrgId?: number;
  active!: boolean;
  dateAdded!: Date;
  dateModified!: Date;

  // Populated from relations
  itemName?: string;
  locationName?: string;
  sharedOrgName?: string;
}

export class CreateUserInventoryItemDto {
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

  @IsOptional()
  @IsInt()
  sharedOrgId?: number;
}

export class UpdateUserInventoryItemDto {
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
  @IsInt()
  sharedOrgId?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UserInventorySearchDto {
  @IsInt()
  gameId!: number;

  @IsOptional()
  @IsInt()
  uexItemId?: number;

  @IsOptional()
  @IsInt()
  locationId?: number;

  @IsOptional()
  @IsInt()
  sharedOrgId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class UserInventorySummaryDto {
  userId!: number;
  gameId!: number;
  totalItems!: number;
  uniqueItems!: number;
  locationCount!: number;
  sharedItemsCount!: number;
  lastUpdated!: Date;
}
