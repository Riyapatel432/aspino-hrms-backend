import { IsString, IsNotEmpty, IsDateString, MinLength } from 'class-validator';

export class ApplyLeaveDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'An employee must be selected.' })
  employeeId: string;

  @IsString({ message: 'Leave type must be a string.' })
  @IsNotEmpty({ message: 'Leave type is required (e.g. Casual, Sick, Earned).' })
  leaveType: string;

  @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Leave start date is required.' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Leave end date is required.' })
  endDate: string;

  @IsString({ message: 'Reason must be a string.' })
  @IsNotEmpty({ message: 'A reason for the leave application is required.' })
  @MinLength(5, { message: 'Reason must be at least 5 characters.' })
  reason: string;
}
