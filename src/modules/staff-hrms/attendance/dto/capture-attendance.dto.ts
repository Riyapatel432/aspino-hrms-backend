import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CaptureAttendanceDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'An employee must be selected.' })
  employeeId: string;

  @IsDateString({}, { message: 'Date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Attendance date is required.' })
  date: string;

  @IsString({ message: 'Check-in time must be a string.' })
  @IsOptional()
  checkIn?: string;

  @IsString({ message: 'Check-out time must be a string.' })
  @IsOptional()
  checkOut?: string;

  @IsString({ message: 'Status must be a string.' })
  @IsOptional()
  status?: string;

  @IsString({ message: 'Shift ID must be a string.' })
  @IsOptional()
  shiftId?: string;

  @IsString({ message: 'Shift name must be a string.' })
  @IsOptional()
  shiftName?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Total work hours must be a number.' })
  @Min(0, { message: 'Total work hours cannot be negative.' })
  @Max(24, { message: 'Total work hours cannot exceed 24.' })
  @IsOptional()
  totalWorkHours?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'OT hours must be a number.' })
  @Min(0, { message: 'OT hours cannot be negative.' })
  @IsOptional()
  otHours?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Late hours must be a number.' })
  @Min(0)
  @IsOptional()
  lateHours?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Early going hours must be a number.' })
  @Min(0)
  @IsOptional()
  earlyGoingHours?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Present day must be a number.' })
  @IsOptional()
  presentDay?: number;

  @IsBoolean({ message: 'isHalfDay must be a boolean.' })
  @IsOptional()
  isHalfDay?: boolean;

  @IsBoolean({ message: 'isSundayPresent must be a boolean.' })
  @IsOptional()
  isSundayPresent?: boolean;

  @IsBoolean({ message: 'isFullNightPresent must be a boolean.' })
  @IsOptional()
  isFullNightPresent?: boolean;

  @IsBoolean({ message: 'isHolidayPresent must be a boolean.' })
  @IsOptional()
  isHolidayPresent?: boolean;

  @IsString({ message: 'Capture method must be a string.' })
  @IsOptional()
  captureMethod?: string;
}
