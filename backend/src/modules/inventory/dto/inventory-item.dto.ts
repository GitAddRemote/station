import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['user', 'org'] })
  ownerType!: 'user' | 'org';

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;

  @ApiProperty({ format: 'uuid' })
  catalogEntryId!: string;

  @ApiProperty({ enum: ['item', 'commodity', 'vehicle'] })
  catalogKind!: 'item' | 'commodity' | 'vehicle';

  @ApiProperty()
  itemName!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  categoryPath!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  locationId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  locationName!: string | null;

  @ApiProperty({ format: 'uuid' })
  unitOfMeasureId!: string;

  @ApiProperty()
  unitOfMeasureCode!: string;

  @ApiProperty()
  unitOfMeasureLabel!: string;

  @ApiProperty({ nullable: true })
  unitOfMeasureDescription!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  quality!: number | null;

  @ApiPropertyOptional({ nullable: true })
  alias!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class InventorySummaryCategoryDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  categoryPath!: string;

  @ApiProperty()
  totalQuantity!: number;
}

export class InventorySummaryDto {
  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalQuantity!: number;

  @ApiProperty({ type: () => [InventorySummaryCategoryDto] })
  byCategory!: InventorySummaryCategoryDto[];
}

export class PaginatedInventoryItemsDto {
  @ApiProperty({ type: () => [InventoryItemDto] })
  data!: InventoryItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiPropertyOptional({ type: () => InventorySummaryDto, nullable: true })
  summary?: InventorySummaryDto;
}
