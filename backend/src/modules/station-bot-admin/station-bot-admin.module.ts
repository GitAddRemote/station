import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StationBotAuthService } from './station-bot-auth.service';
import { StationBotAdminController } from './station-bot-admin.controller';

@Module({
  imports: [HttpModule],
  controllers: [StationBotAdminController],
  providers: [StationBotAuthService],
  exports: [StationBotAuthService],
})
export class StationBotAdminModule {}
