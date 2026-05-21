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
  quantity!: number;
  notes?: string;
  sharedOrgId?: number | null;
  active!: boolean;
  dateAdded!: Date;
  dateModified!: Date;

  // Populated from relations
  itemName?: string;
  sharedOrgName?: string;
  categoryName?: string;
}

export class CreateUserInventoryItemDto {
  @IsInt()
  gameId!: number;

  @IsInt()
  uexItemId!: number;

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
  @IsNumber()
  @Min(0)
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsInt()
  uexItemId?: number;

  @IsOptional()
  @IsInt()
  sharedOrgId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  sort?: 'name' | 'quantity' | 'date_added' | 'date_modified';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsBoolean()
  sharedOnly?: boolean;
}

export class UserInventorySummaryDto {
  userId!: number;
  gameId!: number;
  totalItems!: number;
  uniqueItems!: number;
  sharedItemsCount!: number;
  lastUpdated!: Date;
}
