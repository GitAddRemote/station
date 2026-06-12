import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ minimum: 0.000001 })
  @IsOptional()
  @Transform(fallback<number>('quantity', (resolved) => Number(resolved)))
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  quantity?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(fallback('unit_of_measure_id'))
  @IsUUID()
  unitOfMeasureId?: string;

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

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @IsOptional()
  @Transform(fallback('custom_name'))
  @IsString()
  @MaxLength(255)
  customName?: string | null;
}
