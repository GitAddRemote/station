import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateInventoryListDto {
  @ApiProperty({ maxLength: 100, example: 'To Sell' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
