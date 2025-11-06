import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
    @Param('userId', ParseIntPipe) userId: number,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    const permissions = await this.permissionsService.getUserPermissionsArray(
      userId,
      organizationId,
    );
    return { permissions };
  }
}
