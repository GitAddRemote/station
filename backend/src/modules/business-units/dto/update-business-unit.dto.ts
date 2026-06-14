import {
  IsString,
  IsIn,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { BusinessUnitKind } from '../business-unit.entity';

const KINDS: BusinessUnitKind[] = [
  'division',
  'department',
  'team',
  'squad',
  'wing',
  'custom',
];

export class UpdateBusinessUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsIn(KINDS)
  kind?: BusinessUnitKind;

  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
