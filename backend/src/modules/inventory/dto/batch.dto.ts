import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchLocationConflictItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  currentLocationId!: string | null;

  @ApiProperty({ nullable: true })
  currentLocationName!: string | null;

  @ApiProperty()
  targetLocationId!: string;

  @ApiProperty()
  targetLocationName!: string;
}

export class BatchLocationConflictDto {
  @ApiProperty({ type: [BatchLocationConflictItemDto] })
  conflictingItems!: BatchLocationConflictItemDto[];
}

export class BatchDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerType!: 'user' | 'org';

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  locationId!: string;

  @ApiPropertyOptional()
  locationName?: string;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedBatchesDto {
  @ApiProperty({ type: [BatchDto] })
  data!: BatchDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
