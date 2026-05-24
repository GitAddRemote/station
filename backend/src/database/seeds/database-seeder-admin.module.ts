import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseSeederAdminService } from './database-seeder-admin.service';
import { User } from '../../modules/users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  providers: [DatabaseSeederAdminService],
  exports: [DatabaseSeederAdminService],
})
export class DatabaseSeederAdminModule {}
