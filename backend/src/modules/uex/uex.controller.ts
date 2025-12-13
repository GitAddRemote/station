import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UexService } from './uex.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UexItemSearchDto } from './dto/uex-item-search.dto';
import { UexStarSystemFilterDto } from './dto/uex-star-system-filter.dto';

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

  @Get('star-systems')
  async listStarSystems(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: UexStarSystemFilterDto,
  ) {
    return this.uexService.getStarSystems(filters);
  }
}
