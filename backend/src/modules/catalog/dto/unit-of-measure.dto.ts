import { ApiProperty } from '@nestjs/swagger';

export class UnitOfMeasureDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  abbreviation!: string;

  @ApiProperty({
    enum: ['item', 'commodity', 'vehicle'],
    nullable: true,
  })
  catalog_kind!: 'item' | 'commodity' | 'vehicle' | null;

  @ApiProperty()
  scale_factor!: number;

  @ApiProperty()
  sort_order!: number;
}
