import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity'
import { UserDto } from '../users/dto/user.dto';
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {

  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHash = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8WZ0p/7eJYJg6eW9j5Cnz4Gf5Eme1e';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    const trimmedPass = pass.trim();

    const hashToCompare = user?.password ?? this.dummyHash;
    const isMatch = await bcrypt.compare(trimmedPass, hashToCompare);

    if (user && isMatch) {
      const { password, ...result } = user;
      return result;
    }

    this.logger.warn(`Authentication failed for user: ${username}`);
    return null;    
  }

  async login(user: any): Promise<{ access_token: string }> {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(userDto: UserDto): Promise<Omit<User, 'password'>> {
    // Don’t hash here any more—UsersService.create() will do it.
    const newUser = await this.usersService.create(userDto);
    const { password, ...result } = newUser;
    return result;
  }

}

