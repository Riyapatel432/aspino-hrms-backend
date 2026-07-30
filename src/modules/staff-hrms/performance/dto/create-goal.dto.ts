import { IsString, IsNotEmpty, IsNumber, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'An employee must be selected.' })
  employeeId: string;

  @IsString({ message: 'Appraisal cycle ID must be a string.' })
  @IsNotEmpty({ message: 'An appraisal cycle must be selected.' })
  cycleId: string;

  @IsString({ message: 'Goal title must be a string.' })
  @IsNotEmpty({ message: 'Goal title is required.' })
  @MinLength(3, { message: 'Goal title must be at least 3 characters.' })
  title: string;

  @IsString({ message: 'Description must be a string.' })
  @IsNotEmpty({ message: 'Goal description / key results are required.' })
  @MinLength(10, { message: 'Description must be at least 10 characters.' })
  description: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Weightage must be a number.' })
  @Min(1, { message: 'Weightage must be at least 1%.' })
  @Max(100, { message: 'Weightage cannot exceed 100%.' })
  weightage: number;
}
