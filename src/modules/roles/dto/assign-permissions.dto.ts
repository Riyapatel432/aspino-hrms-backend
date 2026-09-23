import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignPermissionsDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
