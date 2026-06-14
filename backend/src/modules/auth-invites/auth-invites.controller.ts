import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AuthInvitesService } from './auth-invites.service';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ConfigService } from '@nestjs/config';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

class GenerateInviteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}

@ApiTags('auth-invites')
@ApiBearerAuth('access-token')
@Controller('auth-invites')
export class AuthInvitesController {
  constructor(
    private readonly authInvitesService: AuthInvitesService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Generate a new invite link (super admin only)' })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post()
  async generate(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateInviteDto,
  ) {
    const invite = await this.authInvitesService.generateInvite(
      req.user.userId,
      dto.expiresInDays,
    );
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    return {
      id: invite.id,
      token: invite.token,
      inviteUrl: `${frontendUrl}/register?invite=${invite.token}`,
      expiresAt: invite.expiresAt,
    };
  }

  @ApiOperation({ summary: 'List all invites (super admin only)' })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get()
  list() {
    return this.authInvitesService.listInvites();
  }

  @ApiOperation({ summary: 'Validate an invite token (public, rate-limited)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('validate/:token')
  async validate(@Param('token') token: string) {
    try {
      const invite = await this.authInvitesService.validateToken(token);
      return { valid: true, expiresAt: invite.expiresAt.toISOString() };
    } catch {
      return { valid: false };
    }
  }

  @ApiOperation({ summary: 'Revoke an invite (super admin only)' })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async revoke(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    void req;
    await this.authInvitesService.revokeInvite(id);
  }
}
