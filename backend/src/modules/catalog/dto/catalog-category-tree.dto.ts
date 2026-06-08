import { ApiProperty } from '@nestjs/swagger';

export class CatalogCategoryTreeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty({ type: [String] })
  pathIds!: string[];

  @ApiProperty()
  depth!: number;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: () => [CatalogCategoryTreeDto] })
  children!: CatalogCategoryTreeDto[];
}
