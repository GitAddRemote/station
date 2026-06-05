import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RotateOauthClientSecretDto {
  @ApiProperty({
    example: 'new-super-secret-value',
    minLength: 32,
    maxLength: 128,
  })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  clientSecret!: string;
}
