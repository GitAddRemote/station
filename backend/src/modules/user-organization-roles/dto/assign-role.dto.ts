import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  organizationId!: string;

  @IsUUID()
  roleId!: string;
}
