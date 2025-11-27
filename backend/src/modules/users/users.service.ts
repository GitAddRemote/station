import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';
import { UserDto } from './dto/user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: UsersRepository,
  ) {}

  async findOne(username: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { username } });
    return user || undefined;
  }

  async findById(id: number): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { id } });
    return user || undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user || undefined;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async create(userDto: UserDto): Promise<User> {
    // 1. Destructure so we don't accidentally mutate the DTO
    const { password, ...rest } = userDto;

    // 2. Trim and salt+hash exactly once
    const trimmed = password.trim();
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(trimmed, saltRounds);

    // 3. Create a new entity instance
    const user = this.usersRepository.create({
      ...rest,
      password: hashedPassword,
    });

    // 4. Persist and return with proper error handling
    try {
      return await this.usersRepository.save(user);
    } catch (error: unknown) {
      // Handle duplicate username or email
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        // PostgreSQL unique constraint violation
        const detail = 'detail' in error ? String(error.detail) : '';
        if (detail.includes('username')) {
          throw new ConflictException('Username already exists');
        } else if (detail.includes('email')) {
          throw new ConflictException('Email already exists');
        }
        throw new ConflictException(
          'User with this information already exists',
        );
      }
      throw error;
    }
  }

  async update(id: number, userDto: Partial<UserDto>): Promise<User> {
    await this.usersRepository.update(id, userDto);
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async delete(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update only the profile fields that are provided
    if (updateProfileDto.firstName !== undefined) {
      user.firstName = updateProfileDto.firstName;
    }
    if (updateProfileDto.lastName !== undefined) {
      user.lastName = updateProfileDto.lastName;
    }
    if (updateProfileDto.phoneNumber !== undefined) {
      user.phoneNumber = updateProfileDto.phoneNumber;
    }
    if (updateProfileDto.bio !== undefined) {
      user.bio = updateProfileDto.bio;
    }

    return this.usersRepository.save(user);
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(userId, { password: hashedPassword });
  }
}
