import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

const fallback =
  <T>(snakeCaseKey: string, transform?: (value: unknown) => T) =>
  ({ value, obj }: { value: unknown; obj: Record<string, unknown> }): T => {
    const resolved = value ?? obj[snakeCaseKey];
    return transform ? transform(resolved) : (resolved as T);
  };

export class CreateInventoryItemDto {
  @ApiPropertyOptional({ enum: ['user', 'org'] })
  @IsOptional()
  @Transform(fallback('owner_type'))
  @IsIn(['user', 'org'])
  ownerType?: 'user' | 'org';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(fallback('owner_id'))
  @IsUUID()
  ownerId?: string;

  @ApiProperty({ format: 'uuid' })
  @Transform(fallback('catalog_entry_id'))
  @IsUUID()
  catalogEntryId!: string;

  @ApiProperty({ minimum: 0.000001 })
  @Transform(fallback<number>('quantity', (resolved) => Number(resolved)))
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  quantity!: number;

  @ApiProperty({ format: 'uuid' })
  @Transform(fallback('unit_of_measure_id'))
  @IsUUID()
  unitOfMeasureId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @Transform(fallback('location_id'))
  @IsUUID()
  locationId?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Transform(
    fallback<number | null>('quality', (resolved) =>
      resolved === null || resolved === undefined || resolved === ''
        ? null
        : Number(resolved),
    ),
  )
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quality?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(fallback('notes'))
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(
    fallback<boolean>(
      'is_org_available',
      (resolved) => resolved === 'true' || resolved === true,
    ),
  )
  @IsBoolean()
  isOrgAvailable?: boolean;

  @ApiPropertyOptional({ nullable: true, maxLength: 64 })
  @IsOptional()
  @Transform(fallback('alias'))
  @IsString()
  @MaxLength(64)
  alias?: string | null;
}
