import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
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

@ApiTags('oauth-clients')
@ApiSecurity('internal-api-key')
@UseGuards(InternalApiKeyGuard)
@Controller('oauth-clients')
export class OauthClientsController {
  constructor(private readonly oauthClientsService: OauthClientsService) {}

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
}
