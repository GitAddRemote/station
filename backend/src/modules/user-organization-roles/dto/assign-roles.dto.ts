import { IsNumber, IsArray, ArrayMinSize } from 'class-validator';

export class AssignRolesDto {
  @IsNumber()
  userId!: number;

  @IsNumber()
  organizationId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  roleIds!: number[];
}
