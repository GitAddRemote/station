import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
  IsInt,
  IsIn,
} from 'class-validator';
import { LocationPairRequired } from '../../../common/decorators/location-pair.decorator';

export class UserInventoryItemDto {
  id!: string;
  userId!: number;
  gameId!: number;
  uexItemId!: number;
  quantity!: number;
  unitOfMeasure!: 'unit' | 'scu' | 'uscu';
  quality?: number | null;
  locationType?: string | null;
  locationUexId?: number | null;
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

@LocationPairRequired()
export class CreateUserInventoryItemDto {
  @IsInt()
  gameId!: number;

  @IsInt()
  uexItemId!: number;

  @IsNumber()
  @Min(0.000001)
  @Max(999999.999999)
  quantity!: number;

  @IsOptional()
  @IsIn(['unit', 'scu', 'uscu'])
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  quality?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  locationType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  locationUexId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  sharedOrgId?: number;
}

@LocationPairRequired()
export class UpdateUserInventoryItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  @Max(999999.999999)
  quantity?: number;

  @IsOptional()
  @IsIn(['unit', 'scu', 'uscu'])
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  quality?: number | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  locationType?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  locationUexId?: number | null;

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
  @Min(0)
  @Max(32767)
  minQuality?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  maxQuality?: number;

  @IsOptional()
  @IsIn(['unit', 'scu', 'uscu'])
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';

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
  @IsIn(['name', 'quantity', 'quality', 'date_added', 'date_modified'])
  sort?: 'name' | 'quantity' | 'quality' | 'date_added' | 'date_modified';

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

export class SplitUserInventoryItemDto {
  @IsNumber()
  @Min(0.000001)
  @Max(999999.999999)
  splitQuantity!: number;
}
