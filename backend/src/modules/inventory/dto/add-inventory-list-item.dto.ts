import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddInventoryListItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  inventoryItemId!: string;
}
