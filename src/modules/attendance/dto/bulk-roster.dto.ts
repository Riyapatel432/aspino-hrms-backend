import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class BulkCreateRosterDto {
  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsArray({ message: 'employeeIds must be an array of employee IDs.' })
  @IsNotEmpty({ message: 'At least one employee must be selected.' })
  employeeIds: string[];

  @IsString({ message: 'Shift ID must be a string.' })
  @IsNotEmpty({ message: 'A target shift must be selected.' })
  shiftId: string;

  @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Start date is required.' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'End date is required.' })
  endDate: string;

  @IsOptional()
  @IsArray()
  daysOfWeek?: number[]; // [1, 2, 3, 4, 5] for Mon-Fri or [] for all days

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  managedByHod?: string;

  @IsOptional()
  @IsString()
  changedByName?: string;

  @IsOptional()
  @IsString()
  changedByRole?: string;
}
