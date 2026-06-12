import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { AddItemsToBatchDto } from './dto/add-items-to-batch.dto';
import {
  BatchDto,
  BatchLocationConflictDto,
  PaginatedBatchesDto,
} from './dto/batch.dto';

@ApiTags('inventory-batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/inventory/batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new batch' })
  @ApiResponse({ status: 201, type: BatchDto })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBatchDto,
  ): Promise<BatchDto> {
    return this.batchService.createBatch(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List batches (paginated)' })
  @ApiResponse({ status: 200, type: PaginatedBatchesDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedBatchesDto> {
    return this.batchService.listBatches(req.user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single batch' })
  @ApiResponse({ status: 200, type: BatchDto })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  getOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BatchDto> {
    return this.batchService.getBatch(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a batch (name or location)' })
  @ApiResponse({ status: 200, type: BatchDto })
  @ApiResponse({
    status: 409,
    type: BatchLocationConflictDto,
    description: 'Location conflict — retry with ?force=true',
  })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchDto,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ): Promise<BatchDto> {
    return this.batchService.updateBatch(
      req.user.userId,
      id,
      dto,
      force ?? false,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a batch (items are unlinked, not deleted)' })
  @ApiResponse({ status: 204 })
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.batchService.deleteBatch(req.user.userId, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to a batch' })
  @ApiResponse({ status: 200, type: BatchDto })
  @ApiResponse({
    status: 409,
    type: BatchLocationConflictDto,
    description: 'Location conflict — retry with ?force=true',
  })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  addItems(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddItemsToBatchDto,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ): Promise<BatchDto | BatchLocationConflictDto> {
    return this.batchService.addItemsToBatch(
      req.user.userId,
      id,
      dto,
      force ?? false,
    );
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item from a batch' })
  @ApiResponse({ status: 204 })
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.batchService.removeItemFromBatch(req.user.userId, id, itemId);
  }
}
