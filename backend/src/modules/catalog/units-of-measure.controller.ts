import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { UnitOfMeasureDto } from './dto/unit-of-measure.dto';

@ApiTags('units-of-measure')
@Controller('api/units-of-measure')
export class UnitsOfMeasureController {
  constructor(private readonly catalogService: CatalogService) {}

  @ApiOperation({ summary: 'Get active units of measure' })
  @ApiResponse({ status: 200, type: [UnitOfMeasureDto] })
  @Get()
  async listUnitsOfMeasure(): Promise<UnitOfMeasureDto[]> {
    return this.catalogService.getUnitsOfMeasure();
  }
}
