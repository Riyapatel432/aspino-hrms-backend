import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ChangeShiftDto {
  @IsString({ message: 'New shift ID is required.' })
  @IsNotEmpty({ message: 'New shift ID is required.' })
  newShiftId: string;

  @IsOptional()
  @IsString({ message: 'Reason must be a text explanation.' })
  reason?: string;

  @IsOptional()
  @IsString()
  changedById?: string;

  @IsOptional()
  @IsString()
  changedByName?: string;

  @IsOptional()
  @IsString()
  changedByRole?: string;
}
