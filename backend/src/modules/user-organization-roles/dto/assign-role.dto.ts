import { IsNumber } from 'class-validator';

export class AssignRoleDto {
  @IsNumber()
  userId!: number;

  @IsNumber()
  organizationId!: number;

  @IsNumber()
  roleId!: number;
}
