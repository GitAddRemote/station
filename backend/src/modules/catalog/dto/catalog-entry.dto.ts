import { ApiProperty } from '@nestjs/swagger';

export class CatalogEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['item', 'commodity', 'vehicle'] })
  catalogKind!: 'item' | 'commodity' | 'vehicle';

  @ApiProperty({ nullable: true })
  uexId!: number | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categoryPath!: string;

  @ApiProperty()
  isAvailableLive!: boolean;

  @ApiProperty({ nullable: true })
  isIllegal!: boolean | null;

  @ApiProperty({ nullable: true })
  isConcept!: boolean | null;

  @ApiProperty({ nullable: true })
  size!: number | null;

  @ApiProperty({ nullable: true })
  scu!: string | null;

  @ApiProperty({ nullable: true })
  crewMin!: number | null;

  @ApiProperty({ nullable: true })
  crewMax!: number | null;

  @ApiProperty({ nullable: true, type: Object })
  baseProperties!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true, type: Object })
  attributes!: Record<string, unknown> | null;
}

export class PaginatedCatalogEntriesDto {
  @ApiProperty({ type: () => [CatalogEntryDto] })
  data!: CatalogEntryDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
