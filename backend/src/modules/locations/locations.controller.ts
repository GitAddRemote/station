import {
  Controller,
  Get,
  Headers,
  Query,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LocationsService } from './locations.service';
import { LocationSearchDto } from './dto/location.dto';
import { Response } from 'express';

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

  @Get('storable')
  async listStorable(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    searchDto: LocationSearchDto,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const gameId = searchDto.gameId || 1;
    const { etag, locations } =
      await this.locationsService.findStorableLocations(gameId);

    if (ifNoneMatch && ifNoneMatch === etag) {
      response.status(304);
      return;
    }

    response.setHeader('ETag', etag);
    return locations;
  }
}
