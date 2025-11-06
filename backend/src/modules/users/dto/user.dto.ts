import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class UserDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  isActive?: boolean = true; // Optional, defaults to true in User entity if not provided
}
