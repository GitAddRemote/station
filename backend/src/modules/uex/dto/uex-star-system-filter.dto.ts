import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class UexStarSystemFilterDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'false' ? false : value === 'true' ? true : value,
  )
  activeOnly?: boolean = true;
}
