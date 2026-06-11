import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StationBotAuthService } from './station-bot-auth.service';
import { StationBotIntegrationStatusDto } from './dto/station-bot-integration-status.dto';
import { OrgGuildMappingService } from './org-guild-mapping.service';
import { UpsertGuildMappingDto } from './dto/upsert-guild-mapping.dto';
import { OrgGuildMapping } from './entities/org-guild-mapping.entity';
import { SystemPermissionsGuard } from '../permissions/guards/system-permissions.guard';
import { RequireSystemPermission } from '../permissions/decorators/require-system-permission.decorator';
import { SystemPermission } from '../permissions/system-permissions.constants';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@ApiTags('station-bot-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('station-bot-admin')
export class StationBotAdminController {
  constructor(
    private readonly botAuth: StationBotAuthService,
    private readonly guildMappings: OrgGuildMappingService,
  ) {}

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

  @Get('guild-mappings')
  @ApiOperation({ summary: 'List guild mappings visible to the current user' })
  async listGuildMappings(
    @Request() req: AuthenticatedRequest,
  ): Promise<OrgGuildMapping[]> {
    return this.guildMappings.findForUser(req.user.userId);
  }

  @Get('guild-mappings/all')
  @UseGuards(SystemPermissionsGuard)
  @RequireSystemPermission(
    SystemPermission.CAN_VIEW_STATION_BOT_OPERATOR_CONSOLE,
  )
  @ApiOperation({
    summary: 'List all guild mappings (super-admin only)',
  })
  async listAllGuildMappings(): Promise<OrgGuildMapping[]> {
    return this.guildMappings.findAll();
  }

  @Post('guild-mappings')
  @UseGuards(SystemPermissionsGuard)
  @RequireSystemPermission(
    SystemPermission.CAN_VIEW_STATION_BOT_OPERATOR_CONSOLE,
  )
  @ApiOperation({
    summary: 'Create or update an org-to-guild mapping (super-admin only)',
  })
  async upsertGuildMapping(
    @Body() dto: UpsertGuildMappingDto,
  ): Promise<OrgGuildMapping> {
    return this.guildMappings.upsert(dto);
  }

  @Delete('guild-mappings/:id')
  @UseGuards(SystemPermissionsGuard)
  @RequireSystemPermission(
    SystemPermission.CAN_VIEW_STATION_BOT_OPERATOR_CONSOLE,
  )
  @ApiOperation({ summary: 'Deactivate a guild mapping (super-admin only)' })
  async deactivateGuildMapping(@Param('id') id: string): Promise<void> {
    return this.guildMappings.deactivate(id);
  }
}
