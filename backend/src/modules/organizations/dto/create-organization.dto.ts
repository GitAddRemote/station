import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  gameId?: number;
}
