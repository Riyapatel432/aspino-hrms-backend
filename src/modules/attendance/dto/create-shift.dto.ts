import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateShiftDto {
  @IsString({ message: 'Shift name must be a string.' })
  @IsNotEmpty({ message: 'Shift name is required (e.g. Morning, Night, General).' })
  name: string;

  @IsString({ message: 'Start time must be a string.' })
  @IsNotEmpty({ message: 'Shift start time is required (e.g. 09:00).' })
  startTime: string;

  @IsString({ message: 'End time must be a string.' })
  @IsNotEmpty({ message: 'Shift end time is required (e.g. 17:30).' })
  endTime: string;

  @IsOptional()
  @IsNumber({}, { message: 'Grace time must be a number in minutes.' })
  @Min(0, { message: 'Grace time cannot be negative.' })
  graceTimeMinutes?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Break duration must be a number in minutes.' })
  @Min(0, { message: 'Break duration cannot be negative.' })
  breakDurationMinutes?: number;

  @IsOptional()
  @IsString({ message: 'Break rules must be a string description.' })
  breakRules?: string;

  @IsOptional()
  @IsBoolean({ message: 'isNightShift must be a boolean.' })
  isNightShift?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
