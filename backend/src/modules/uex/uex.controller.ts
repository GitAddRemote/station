import { Controller, Get, UseGuards } from '@nestjs/common';
import { UexService } from './uex.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/uex')
@UseGuards(JwtAuthGuard)
export class UexController {
  constructor(private readonly uexService: UexService) {}

  @Get('categories')
  async listCategories() {
    return this.uexService.getActiveCategories();
  }
}
