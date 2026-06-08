import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { AddInventoryListItemDto } from './dto/add-inventory-list-item.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryListDto } from './dto/create-inventory-list.dto';
import { InventoryListDto } from './dto/inventory-list.dto';
import { InventoryListItemDto } from './dto/inventory-list-item.dto';
import {
  InventoryItemDto,
  PaginatedInventoryItemsDto,
} from './dto/inventory-item.dto';
import { ListInventoryItemsDto } from './dto/list-inventory-items.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Create an inventory item' })
  @ApiResponse({ status: 201, type: InventoryItemDto })
  @Post()
  createItem(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    return this.inventoryService.createItem(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'List inventory items' })
  @ApiResponse({ status: 200, type: PaginatedInventoryItemsDto })
  @Get()
  listItems(
    @Req() req: AuthenticatedRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: ListInventoryItemsDto,
  ): Promise<PaginatedInventoryItemsDto> {
    return this.inventoryService.listItems(req.user.userId, query);
  }

  @ApiOperation({ summary: 'Update an inventory item' })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  @Patch(':id')
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    return this.inventoryService.updateItem(req.user.userId, id, dto);
  }

  @ApiOperation({ summary: 'Delete an inventory item' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  deleteItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.inventoryService.deleteItem(req.user.userId, id);
  }

  @ApiOperation({
    summary: 'Create an inventory list for the authenticated user',
  })
  @ApiResponse({ status: 201, type: InventoryListDto })
  @Post('lists')
  createList(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInventoryListDto,
  ): Promise<InventoryListDto> {
    return this.inventoryService.createList(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'List inventory lists for the authenticated user' })
  @ApiResponse({ status: 200, type: [InventoryListDto] })
  @Get('lists')
  listLists(@Req() req: AuthenticatedRequest): Promise<InventoryListDto[]> {
    return this.inventoryService.listLists(req.user.userId);
  }

  @ApiOperation({
    summary: 'Delete an inventory list for the authenticated user',
  })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('lists/:id')
  deleteList(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.inventoryService.deleteList(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Add an inventory item to a list' })
  @ApiResponse({ status: 200, type: InventoryListItemDto })
  @HttpCode(HttpStatus.OK)
  @Post('lists/:id/items')
  addItemToList(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInventoryListItemDto,
  ): Promise<InventoryListItemDto> {
    return this.inventoryService.addItemToList(req.user.userId, id, dto);
  }

  @ApiOperation({ summary: 'Remove an inventory item from a list' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('lists/:id/items/:inventoryItemId')
  removeItemFromList(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inventoryItemId', ParseUUIDPipe) inventoryItemId: string,
  ): Promise<void> {
    return this.inventoryService.removeItemFromList(
      req.user.userId,
      id,
      inventoryItemId,
    );
  }
}
