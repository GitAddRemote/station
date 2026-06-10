import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(AuthGuard('jwt'))
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('user/:userId/organization/:organizationId')
  async getUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const permissions = await this.permissionsService.getUserPermissionsArray(
      userId,
      organizationId,
    );
    return { permissions };
  }
}
