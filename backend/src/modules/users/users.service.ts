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
    userDto.password = await bcrypt.hash(userDto.password, 10);
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = this.usersRepository.create({...userDto, password: hashedPassword});
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
