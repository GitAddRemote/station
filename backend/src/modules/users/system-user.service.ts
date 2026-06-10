import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemUserService implements OnModuleInit {
  private systemUserId: string | null = null;
  private readonly SYSTEM_USERNAME = 'station-system';

  constructor(
    @InjectPinoLogger(SystemUserService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.info('Initializing system user service...');

    let systemUser = await this.usersRepository.findOne({
      where: { username: this.SYSTEM_USERNAME, isSystemUser: true },
      select: ['id'],
    });

    if (!systemUser && process.env.NODE_ENV === 'test') {
      this.logger.warn(
        'System user not found in test environment - creating automatically',
      );
      systemUser = await this.createSystemUser();
    }

    if (!systemUser) {
      throw new Error(
        'System user not found! Run migrations to seed system user: pnpm migration:run',
      );
    }

    this.systemUserId = systemUser.id;
    this.logger.info(`System user initialized with ID: ${this.systemUserId}`);
  }

  private async createSystemUser(): Promise<User> {
    const unusablePassword = await bcrypt.hash(
      'SYSTEM_USER_NO_LOGIN_' + Math.random(),
      10,
    );

    const systemUser = this.usersRepository.create({
      username: this.SYSTEM_USERNAME,
      email: 'system@station.internal',
      password: unusablePassword,
      isActive: true,
      isSystemUser: true,
    });

    return await this.usersRepository.save(systemUser);
  }

  getSystemUserId(): string {
    if (!this.systemUserId) {
      throw new Error(
        'System user not initialized. Ensure SystemUserService.onModuleInit() has been called.',
      );
    }
    return this.systemUserId;
  }

  isSystemUser(userId: string): boolean {
    return userId === this.systemUserId;
  }
}
