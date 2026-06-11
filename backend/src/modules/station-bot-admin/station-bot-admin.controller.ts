import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StationBotAuthService } from './station-bot-auth.service';
import { StationBotIntegrationStatusDto } from './dto/station-bot-integration-status.dto';

@ApiTags('station-bot-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('station-bot-admin')
export class StationBotAdminController {
  constructor(private readonly botAuth: StationBotAuthService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get Station-Bot downstream integration auth status',
    description:
      'Returns the current authentication state between Station and Station-Bot. ' +
      'Requires an authenticated Station user session.',
  })
  async getStatus(): Promise<StationBotIntegrationStatusDto> {
    return this.botAuth.getIntegrationStatus();
  }
}
