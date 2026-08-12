import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateRosterDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'An employee must be selected.' })
  employeeId: string;

  @IsString({ message: 'Shift ID must be a string.' })
  @IsNotEmpty({ message: 'A shift must be selected.' })
  shiftId: string;

  @IsDateString({}, { message: 'Date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Roster date is required.' })
  date: string;
}
