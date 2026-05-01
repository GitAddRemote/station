import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  Matches,
} from 'class-validator';

export class RegisterOauthClientDto {
  @ApiProperty({ example: 'station-bot' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'clientId may only contain lowercase letters, digits, and hyphens',
  })
  clientId!: string;

  @ApiProperty({ example: 'super-secret-value', minLength: 32 })
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;

  @ApiProperty({ example: ['bot:api'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];
}
