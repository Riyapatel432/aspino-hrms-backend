import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBreakIncidentDto {
  @IsString({ message: 'Employee ID is required.' })
  @IsNotEmpty()
  employeeId: string;

  @IsOptional()
  @IsString()
  attendanceId?: string;

  @IsDateString({}, { message: 'Incident date must be a valid date.' })
  @IsNotEmpty({ message: 'Incident date is required.' })
  incidentDate: string;

  @IsString({ message: 'Break type is required.' })
  @IsNotEmpty()
  breakType: string; // e.g. LUNCH_BREAK, TEA_BREAK, GENERAL_BREAK

  @Type(() => Number)
  @IsNumber({}, { message: 'Excess minutes must be a number.' })
  @Min(1, { message: 'Excess minutes must be at least 1 min.' })
  excessMinutes: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'Deduction hours must be a number.' })
  deductionHours?: number;

  @IsOptional()
  @IsString()
  severity?: string; // WARNING, HALF_DAY_DEDUCTION, SALARY_DEDUCTION, VERBAL_ALERT

  @IsString({ message: 'Complaint details / remarks are required.' })
  @IsNotEmpty({ message: 'Please provide detailed complaint notes.' })
  complaintDetails: string;

  @IsOptional()
  @IsString()
  reportedByHodId?: string;

  @IsString({ message: 'Reporter name is required.' })
  @IsNotEmpty()
  reportedByName: string;
}
