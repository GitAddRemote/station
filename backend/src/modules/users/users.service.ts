import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';
import { UserDto } from './dto/user.dto';
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

    // 4. Persist and return
    return this.usersRepository.save(user);
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
}
