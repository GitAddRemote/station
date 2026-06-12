import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MilestoneState } from '../entities/contract-milestone.entity';

export class UpdateMilestoneDto {
  @ApiProperty({ enum: MilestoneState })
  @IsEnum(MilestoneState)
  state!: MilestoneState;
}
