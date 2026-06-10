import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';

export class AssignRolesDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  organizationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  roleIds!: string[];
}
