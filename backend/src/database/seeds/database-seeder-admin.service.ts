import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../modules/users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseSeederAdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async seedAdmin(): Promise<void> {
    const email = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@example.com',
    );
    const username = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const initialPassword = this.configService.get<string>(
      'ADMIN_INITIAL_PASSWORD',
      'ChangeMe!SecurePassword123',
    );
    const expiryDays = this.configService.get<number>(
      'AUTH_PASSWORD_EXPIRY_DAYS',
      90,
    );

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      console.log('Admin account already exists, skipping');
      return;
    }

    const hashedPassword = await bcrypt.hash(initialPassword.trim(), 10);
    const passwordExpiresAt = new Date(
      Date.now() + expiryDays * 24 * 3600 * 1000,
    );

    await this.userRepository.save({
      username,
      email,
      password: hashedPassword,
      isActive: true,
      isSuperAdmin: true,
      passwordChangeRequired: true,
      passwordExpiresAt,
    });

    console.log(`Admin account created: ${email} / ${username}`);
    console.log('⚠️  Admin account created without a role assignment.');
    console.log(
      '    The account has no elevated privileges until an Owner role is manually',
    );
    console.log(
      '    assigned to the user in an organization via the admin UI or a follow-up',
    );
    console.log(
      '    seed step. This is a known limitation — see the issue for future work.',
    );
  }
}
