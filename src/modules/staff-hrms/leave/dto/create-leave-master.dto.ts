import { IsString, IsNotEmpty, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeaveMasterDto {
  @IsString({ message: 'Department must be a string.' })
  @IsNotEmpty({ message: 'Department name is required.' })
  department: string;

  @IsString({ message: 'Fiscal year must be a string.' })
  @IsNotEmpty({ message: 'Fiscal year is required (e.g. FY2025-26).' })
  fiscalYear: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Casual leave days must be a number.' })
  @Min(0, { message: 'Casual leave days cannot be negative.' })
  @Max(365, { message: 'Casual leave days cannot exceed 365.' })
  casualLeave: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Sick leave days must be a number.' })
  @Min(0, { message: 'Sick leave days cannot be negative.' })
  @Max(365, { message: 'Sick leave days cannot exceed 365.' })
  sickLeave: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Earned leave days must be a number.' })
  @Min(0, { message: 'Earned leave days cannot be negative.' })
  @Max(365, { message: 'Earned leave days cannot exceed 365.' })
  earnedLeave: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Other leave days must be a number.' })
  @Min(0, { message: 'Other leave days cannot be negative.' })
  @Max(365, { message: 'Other leave days cannot exceed 365.' })
  otherLeave: number;

  @IsDateString({}, { message: 'Effective from must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Effective from date is required.' })
  effectiveFrom: string;
}
