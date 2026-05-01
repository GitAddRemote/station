import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Equals } from 'class-validator';

export class TokenRequestDto {
  @ApiProperty({ example: 'client_credentials' })
  @IsString()
  @Equals('client_credentials', {
    message: 'grant_type must be "client_credentials"',
  })
  grant_type!: string;

  @ApiProperty({ example: 'station-bot' })
  @IsString()
  @IsNotEmpty()
  client_id!: string;

  @ApiProperty({ example: 'super-secret-value' })
  @IsString()
  @IsNotEmpty()
  client_secret!: string;

  @ApiProperty({ example: 'bot:api', required: false })
  @IsOptional()
  @IsString()
  scope?: string;
}
