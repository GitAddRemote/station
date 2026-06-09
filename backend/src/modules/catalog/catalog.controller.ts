import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
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
import { CatalogService } from './catalog.service';
import {
  CatalogEntryDto,
  PaginatedCatalogEntriesDto,
} from './dto/catalog-entry.dto';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { CatalogCategoryTreeDto } from './dto/catalog-category-tree.dto';
import { UnitOfMeasureDto } from './dto/unit-of-measure.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('api/catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @ApiOperation({ summary: 'Get paginated catalog entries' })
  @ApiResponse({ status: 200, type: PaginatedCatalogEntriesDto })
  @Get()
  async listCatalog(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: CatalogQueryDto,
  ): Promise<PaginatedCatalogEntriesDto> {
    return this.catalogService.searchCatalog(query);
  }

  @ApiOperation({ summary: 'Get the full catalog category tree' })
  @ApiResponse({ status: 200, type: [CatalogCategoryTreeDto] })
  @Get('categories')
  async listCategories(): Promise<CatalogCategoryTreeDto[]> {
    return this.catalogService.getCategoryTree();
  }

  @ApiOperation({ summary: 'List active units of measure' })
  @ApiResponse({ status: 200, type: [UnitOfMeasureDto] })
  @Get('units-of-measure')
  async listUnitsOfMeasure(): Promise<UnitOfMeasureDto[]> {
    return this.catalogService.getUnitsOfMeasure();
  }

  @ApiOperation({ summary: 'Get catalog entry detail' })
  @ApiResponse({ status: 200, type: CatalogEntryDto })
  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CatalogEntryDto> {
    return this.catalogService.getCatalogEntryById(id);
  }
}
