import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ShareItemDto {
  @IsInt()
  @Type(() => Number)
  orgId!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Type(() => Number)
  quantity!: number;
}
