import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
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
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    await this.userOrgRolesService.removeRole(userId, organizationId, roleId);
  }

  @Get('user/:userId/organization/:organizationId')
  async getUserRolesInOrganization(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.userOrgRolesService.getUserRolesInOrganization(
      userId,
      organizationId,
    );
  }

  @Get('user/:userId/organizations')
  async getUserOrganizations(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.userOrgRolesService.getUserOrganizations(userId);
  }

  @Patch('user/:userId/org-priorities')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateOrgPriorities(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { orderedOrgIds: string[] },
  ) {
    await this.userOrgRolesService.updateOrgPriorities(
      userId,
      body.orderedOrgIds,
    );
  }

  @Get('organization/:organizationId/members')
  async getOrganizationMembers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.userOrgRolesService.getOrganizationMembers(organizationId);
  }

  @Patch('organization/:organizationId/members/:userId/business-unit')
  async updateMemberBusinessUnit(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { businessUnitId: string | null },
  ) {
    return this.userOrgRolesService.updateMemberBusinessUnit(
      organizationId,
      userId,
      body.businessUnitId,
    );
  }

  @Delete('organization/:organizationId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMemberFromOrg(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.userOrgRolesService.removeMemberFromOrg(organizationId, userId);
  }

  @Get('organization/:organizationId/role/:roleId/users')
  async getUsersWithRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.userOrgRolesService.getUsersWithRole(organizationId, roleId);
  }
}
