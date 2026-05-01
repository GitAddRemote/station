import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
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

  @ApiProperty({ example: 'super-secret-value', minLength: 32, maxLength: 128 })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  clientSecret!: string;

  @ApiProperty({ example: ['bot:api'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[^,]+$/, {
    each: true,
    message: 'Each scope must not contain a comma',
  })
  scopes!: string[];
}
