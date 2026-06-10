import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

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
  @IsUUID()
  gameId?: string;
}
