import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UexService } from './uex.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UexCommoditySearchDto } from './dto/uex-commodity-search.dto';
import { UexItemSearchDto } from './dto/uex-item-search.dto';
import { UexStarSystemFilterDto } from './dto/uex-star-system-filter.dto';

@ApiTags('uex')
@Controller('api/uex')
@UseGuards(JwtAuthGuard)
export class UexController {
  constructor(private readonly uexService: UexService) {}

  @Get('categories')
  async listCategories() {
    return this.uexService.getActiveCategories();
  }

  @Get('items')
  async listItems(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    searchDto: UexItemSearchDto,
  ) {
    return this.uexService.searchItems(searchDto);
  }

  @ApiOperation({
    summary: 'Search UEX commodities',
    description:
      'Returns paginated commodities filterable by name, category, buyable, sellable, illegal, and fuel flags.',
  })
  @Get('commodities')
  async listCommodities(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    searchDto: UexCommoditySearchDto,
  ) {
    return this.uexService.searchCommodities(searchDto);
  }

  @Get('star-systems')
  async listStarSystems(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: UexStarSystemFilterDto,
  ) {
    return this.uexService.getStarSystems(filters);
  }
}
