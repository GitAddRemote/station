import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LocationsService } from './locations.service';
import { LocationSearchDto } from './dto/location.dto';

@Controller('api/locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async list(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    searchDto: LocationSearchDto,
  ) {
    const payload: LocationSearchDto = {
      ...searchDto,
      gameId: searchDto.gameId || 1,
      limit: searchDto.limit ?? 100,
    };
    return this.locationsService.findAll(payload);
  }
}
