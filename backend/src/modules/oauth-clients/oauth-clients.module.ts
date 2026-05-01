import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OauthClient } from './oauth-client.entity';
import { OauthClientsService } from './oauth-clients.service';
import { OauthClientsController } from './oauth-clients.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OauthClient])],
  controllers: [OauthClientsController],
  providers: [OauthClientsService],
  exports: [OauthClientsService],
})
export class OauthClientsModule {}
