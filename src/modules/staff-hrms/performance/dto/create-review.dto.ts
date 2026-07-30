import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'An employee must be selected.' })
  employeeId: string;

  @IsString({ message: 'Appraisal cycle ID must be a string.' })
  @IsNotEmpty({ message: 'An appraisal cycle must be selected.' })
  cycleId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Self rating must be a number.' })
  @Min(1, { message: 'Self rating must be at least 1.' })
  @Max(10, { message: 'Self rating cannot exceed 10.' })
  @IsOptional()
  selfRating?: number;

  @IsString({ message: 'Self comments must be a string.' })
  @IsOptional()
  selfComments?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Manager rating must be a number.' })
  @Min(1, { message: 'Manager rating must be at least 1.' })
  @Max(10, { message: 'Manager rating cannot exceed 10.' })
  @IsOptional()
  managerRating?: number;

  @IsString({ message: 'Manager comments must be a string.' })
  @IsOptional()
  managerComments?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Final rating must be a number.' })
  @Min(1, { message: 'Final rating must be at least 1.' })
  @Max(10, { message: 'Final rating cannot exceed 10.' })
  @IsOptional()
  finalRating?: number;

  @IsString({ message: 'Status must be a string.' })
  @IsIn(['PENDING', 'COMPLETED'], { message: 'Status must be either PENDING or COMPLETED.' })
  status: string;
}
