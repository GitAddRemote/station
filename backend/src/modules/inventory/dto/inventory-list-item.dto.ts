import { ApiProperty } from '@nestjs/swagger';

export class InventoryListItemDto {
  @ApiProperty({ format: 'uuid' })
  listId!: string;

  @ApiProperty({ format: 'uuid' })
  inventoryItemId!: string;

  @ApiProperty()
  createdAt!: Date;
}
