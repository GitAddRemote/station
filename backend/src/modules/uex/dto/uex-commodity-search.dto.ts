import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function transformBooleanParam({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null) return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class UexCommoditySearchDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(transformBooleanParam)
  isBuyable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(transformBooleanParam)
  isSellable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(transformBooleanParam)
  isIllegal?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(transformBooleanParam)
  isFuel?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
