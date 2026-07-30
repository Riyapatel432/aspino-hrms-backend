import { IsString, IsNotEmpty, IsNumber, IsDateString, Min, IsIn, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateExitDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'An employee must be selected.' })
  employeeId: string;

  @IsString({ message: 'Type must be a string.' })
  @IsIn(['RESIGNATION', 'TERMINATION'], {
    message: 'Exit type must be either RESIGNATION or TERMINATION.',
  })
  type: string;

  @IsDateString({}, { message: 'Resignation/termination date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Resignation or termination date is required.' })
  resignationDate: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Notice period days must be a number.' })
  @Min(0, { message: 'Notice period days cannot be negative.' })
  noticePeriodDays: number;

  @IsDateString({}, { message: 'Last working day must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Last working day is required.' })
  lastWorkingDay: string;

  @IsString({ message: 'Reason must be a string.' })
  @IsNotEmpty({ message: 'Exit reason is required.' })
  @MinLength(5, { message: 'Reason must be at least 5 characters.' })
  reason: string;
}
