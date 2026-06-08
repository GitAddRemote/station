import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return undefined;
};

export class ListInventoryItemsDto {
  @ApiPropertyOptional({ enum: ['user', 'org'] })
  @IsOptional()
  @IsIn(['user', 'org'])
  ownerType?: 'user' | 'org';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orgId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  orgAvailable?: boolean;

  @ApiPropertyOptional({ enum: ['item', 'commodity', 'vehicle'] })
  @IsOptional()
  @IsIn(['item', 'commodity', 'vehicle'])
  catalogKind?: 'item' | 'commodity' | 'vehicle';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  includeSummary?: boolean;
}
