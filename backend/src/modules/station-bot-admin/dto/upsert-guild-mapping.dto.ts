import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertGuildMappingDto {
  @ApiProperty({ description: 'Station organization UUID' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ description: 'Discord guild (server) ID' })
  @IsString()
  @IsNotEmpty()
  discordGuildId!: string;

  @ApiPropertyOptional({
    description: 'Discord guild name at the time of mapping',
  })
  @IsOptional()
  @IsString()
  discordGuildNameSnapshot?: string;
}
