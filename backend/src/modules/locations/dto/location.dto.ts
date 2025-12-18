import { Type } from 'class-transformer';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';
import { LocationType } from '../entities/location.entity';

export class LocationDto {
  id!: string;
  gameId!: number;
  starSystemId?: number;
  locationType!: LocationType;
  displayName!: string;
  shortName!: string;
  hierarchyPath?: Record<string, string>;
  isAvailable!: boolean;
  isLandable?: boolean;
  hasArmistice?: boolean;
  active!: boolean;
}

export class StorableLocationDto {
  id!: string;
  gameId!: number;
  locationType!: LocationType;
  displayName!: string;
  shortName!: string;
  hierarchyPath?: Record<string, string>;
  isAvailable!: boolean;
  isLandable?: boolean;
  hasArmistice?: boolean;
}

export class LocationSelectorDto {
  id!: string;
  displayName!: string;
  type!: string;
  available!: boolean;
}

export class CreateLocationDto {
  @IsInt()
  gameId!: number;

  @IsEnum(LocationType)
  locationType!: LocationType;

  @IsInt()
  @IsOptional()
  starSystemId?: number;

  @IsInt()
  @IsOptional()
  planetId?: number;

  @IsInt()
  @IsOptional()
  moonId?: number;

  @IsInt()
  @IsOptional()
  cityId?: number;

  @IsInt()
  @IsOptional()
  spaceStationId?: number;

  @IsInt()
  @IsOptional()
  outpostId?: number;

  @IsInt()
  @IsOptional()
  poiId?: number;

  @IsString()
  displayName!: string;

  @IsString()
  shortName!: string;

  @IsOptional()
  @IsString()
  hierarchyPath?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  isLandable?: boolean;

  @IsBoolean()
  @IsOptional()
  hasArmistice?: boolean;
}

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  shortName?: string;

  @IsOptional()
  @IsString()
  hierarchyPath?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  isLandable?: boolean;

  @IsBoolean()
  @IsOptional()
  hasArmistice?: boolean;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class LocationSearchDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  gameId?: number;

  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  starSystemId?: number;
}
