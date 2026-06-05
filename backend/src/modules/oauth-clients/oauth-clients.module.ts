import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OauthClient } from './oauth-client.entity';
import { OauthClientsService } from './oauth-clients.service';
import { OauthClientsController } from './oauth-clients.controller';
import { InternalApiKeyGuard } from './internal-api-key.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OauthClient]),
    forwardRef(() => AuthModule),
  ],
  controllers: [OauthClientsController],
  providers: [OauthClientsService, InternalApiKeyGuard],
  exports: [OauthClientsService, InternalApiKeyGuard],
})
export class OauthClientsModule {}
