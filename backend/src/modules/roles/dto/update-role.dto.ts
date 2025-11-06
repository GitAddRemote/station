import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  description?: string;
}
