import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserOrganizationRolesService } from './user-organization-roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Controller('user-organization-roles')
@UseGuards(AuthGuard('jwt'))
export class UserOrganizationRolesController {
  constructor(
    private readonly userOrgRolesService: UserOrganizationRolesService,
  ) {}

  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.userOrgRolesService.assignRole(assignRoleDto);
  }

  @Post('assign-multiple')
  @HttpCode(HttpStatus.CREATED)
  async assignMultipleRoles(@Body() assignRolesDto: AssignRolesDto) {
    return this.userOrgRolesService.assignMultipleRoles(assignRolesDto);
  }

  @Delete('user/:userId/organization/:organizationId/role/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    await this.userOrgRolesService.removeRole(userId, organizationId, roleId);
  }

  @Get('user/:userId/organization/:organizationId')
  async getUserRolesInOrganization(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.userOrgRolesService.getUserRolesInOrganization(
      userId,
      organizationId,
    );
  }

  @Get('user/:userId/organizations')
  async getUserOrganizations(@Param('userId', ParseIntPipe) userId: number) {
    return this.userOrgRolesService.getUserOrganizations(userId);
  }

  @Get('organization/:organizationId/members')
  async getOrganizationMembers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.userOrgRolesService.getOrganizationMembers(organizationId);
  }

  @Get('organization/:organizationId/role/:roleId/users')
  async getUsersWithRole(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.userOrgRolesService.getUsersWithRole(organizationId, roleId);
  }
}
