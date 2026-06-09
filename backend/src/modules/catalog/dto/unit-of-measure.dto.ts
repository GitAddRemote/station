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
  catalogKind!: 'item' | 'commodity' | 'vehicle' | null;

  @ApiProperty()
  scaleFactor!: number;

  @ApiProperty()
  sortOrder!: number;
}
