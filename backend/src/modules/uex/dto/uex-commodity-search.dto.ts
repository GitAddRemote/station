import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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
  @Transform(({ value }) => value === 'true' || value === true)
  isBuyable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSellable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isIllegal?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
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
