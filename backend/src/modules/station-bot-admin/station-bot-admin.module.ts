import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationBotAuthService } from './station-bot-auth.service';
import { StationBotAdminController } from './station-bot-admin.controller';
import { OrgGuildMappingService } from './org-guild-mapping.service';
import { OrgGuildMapping } from './entities/org-guild-mapping.entity';
import { SystemPermissionsGuard } from '../permissions/guards/system-permissions.guard';
import { User } from '../users/user.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([OrgGuildMapping, User]),
    PermissionsModule,
  ],
  controllers: [StationBotAdminController],
  providers: [
    StationBotAuthService,
    OrgGuildMappingService,
    SystemPermissionsGuard,
  ],
  exports: [StationBotAuthService, OrgGuildMappingService],
})
export class StationBotAdminModule {}
