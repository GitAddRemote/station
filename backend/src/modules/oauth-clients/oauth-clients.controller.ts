import {
  Controller,
  Post,
  Patch,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { OauthClientsService } from './oauth-clients.service';
import { RegisterOauthClientDto } from './dto/register-oauth-client.dto';
import { InternalApiKeyGuard } from './internal-api-key.guard';
import { RotateOauthClientSecretDto } from './dto/rotate-oauth-client-secret.dto';
import { AuthService } from '../auth/auth.service';

@ApiTags('oauth-clients')
@ApiSecurity('internal-api-key')
@UseGuards(InternalApiKeyGuard)
@Controller('oauth-clients')
export class OauthClientsController {
  constructor(
    private readonly oauthClientsService: OauthClientsService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({
    summary: 'Register a new OAuth client (admin/internal only)',
  })
  @ApiResponse({ status: 201, description: 'Client registered' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid internal API key',
  })
  @ApiResponse({ status: 409, description: 'Client ID already exists' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async register(@Body() dto: RegisterOauthClientDto) {
    const client = await this.oauthClientsService.register(
      dto.clientId,
      dto.clientSecret,
      dto.scopes,
    );
    return { id: client.id, clientId: client.clientId, scopes: client.scopes };
  }

  @ApiOperation({
    summary:
      'Rotate an OAuth client secret and revoke outstanding client tokens',
  })
  @ApiResponse({ status: 200, description: 'Client secret rotated' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid internal API key',
  })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @Put(':clientId/secret')
  async rotateSecret(
    @Param('clientId') clientId: string,
    @Body() dto: RotateOauthClientSecretDto,
  ) {
    const client = await this.oauthClientsService.rotateSecret(
      clientId,
      dto.clientSecret,
    );
    await this.authService.revokeClientTokens(client.clientId);
    return { id: client.id, clientId: client.clientId, scopes: client.scopes };
  }

  @ApiOperation({
    summary: 'Deactivate an OAuth client and revoke outstanding client tokens',
  })
  @ApiResponse({ status: 200, description: 'Client deactivated' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid internal API key',
  })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @Patch(':clientId/deactivate')
  async deactivate(@Param('clientId') clientId: string) {
    const client = await this.oauthClientsService.deactivate(clientId);
    await this.authService.revokeClientTokens(client.clientId);
    return {
      id: client.id,
      clientId: client.clientId,
      isActive: client.isActive,
      scopes: client.scopes,
    };
  }
}
