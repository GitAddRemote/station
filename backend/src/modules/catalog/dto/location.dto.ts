import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  sourceType!: string;

  @ApiPropertyOptional({ nullable: true })
  starSystemUexId!: number | null;

  @ApiPropertyOptional({ nullable: true })
  starSystemName!: string | null;
}
