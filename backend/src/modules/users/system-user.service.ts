import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemUserService implements OnModuleInit {
  private readonly logger = new Logger(SystemUserService.name);
  private systemUserId: number | null = null;
  private readonly SYSTEM_USER_ID = 1; // Reserved ID for system user

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Cache system user ID at startup
    this.logger.log('Initializing system user service...');

    let systemUser = await this.usersRepository.findOne({
      where: { id: this.SYSTEM_USER_ID, isSystemUser: true },
      select: ['id'],
    });

    // In test environment, auto-create system user if missing
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
    this.logger.log(`System user initialized with ID: ${this.systemUserId}`);
  }

  private async createSystemUser(): Promise<User> {
    const unusablePassword = await bcrypt.hash(
      'SYSTEM_USER_NO_LOGIN_' + Math.random(),
      10,
    );

    const systemUser = this.usersRepository.create({
      id: this.SYSTEM_USER_ID,
      username: 'station-system',
      email: 'system@station.internal',
      password: unusablePassword,
      isActive: true,
      isSystemUser: true,
    });

    return await this.usersRepository.save(systemUser);
  }

  getSystemUserId(): number {
    if (!this.systemUserId) {
      throw new Error(
        'System user not initialized. Ensure SystemUserService.onModuleInit() has been called.',
      );
    }
    return this.systemUserId;
  }

  isSystemUser(userId: number): boolean {
    return userId === this.SYSTEM_USER_ID;
  }
}
