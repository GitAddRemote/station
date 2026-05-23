import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogEtlService } from './catalog-etl.service';
import { EtlRun } from './entities/etl-run.entity';
import { EtlWarning } from './entities/etl-warning.entity';

@Controller('admin/catalog-etl')
@UseGuards(JwtAuthGuard)
export class CatalogEtlController {
  constructor(private readonly catalogEtlService: CatalogEtlService) {}

  @Post('run')
  async triggerRun(): Promise<EtlRun> {
    return this.catalogEtlService.runEtl();
  }

  @Get('runs')
  async getRuns(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<{ data: EtlRun[]; total: number; page: number; limit: number }> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const [data, total] = await this.catalogEtlService.getRuns(
      pageNum,
      limitNum,
    );

    return { data, total, page: pageNum, limit: limitNum };
  }

  @Get('runs/:runId/warnings')
  async getRunWarnings(
    @Param('runId', ParseUUIDPipe) runId: string,
  ): Promise<EtlWarning[]> {
    return this.catalogEtlService.getRunWarnings(runId);
  }
}
