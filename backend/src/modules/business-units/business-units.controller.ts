import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';

@Controller('api/organizations/:orgId/business-units')
@UseGuards(JwtAuthGuard)
export class BusinessUnitsController {
  constructor(private readonly service: BusinessUnitsService) {}

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: CreateBusinessUnitDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessUnitDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
