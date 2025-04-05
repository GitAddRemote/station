import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { UserDto } from '../users/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if(user){
      console.log('Login: Entered password:', pass);
      console.log('Login: Stored password:', user.password);
      const isMatch = await bcrypt.compare(pass.trim(), user.password);
      console.log('Login: Passwords match:', isMatch);  
    }    
    if (user && await bcrypt.compare(pass, user.password)) {
      console.log("password matches"); 
      const { password, ...result } = user;
      return result;
    }
    return null;
 }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(userDto: UserDto): Promise<any> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userDto.password.trim(), saltRounds);
    console.log('Register: Plain password:', userDto.password);
    console.log('Register: Hashed password:', hashedPassword);;
    const newUser = await this.usersService.create({
      ...userDto,
      password: hashedPassword,
    });
    const { password, ...result } = newUser;
    return result;
  }
  
}
