import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsIn,
  MinLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeedbackDto {
  @IsString({ message: 'Panelist ID must be a string.' })
  @IsOptional()
  panelistId?: string;
  @IsString({ message: 'Schedule ID must be a string.' })
  @IsNotEmpty({ message: 'An interview schedule must be selected.' })
  scheduleId: string;

  @IsString({ message: 'Panelist name must be a string.' })
  @IsNotEmpty({ message: 'Panelist name is required.' })
  panelistName: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Rating must be a number.' })
  @Min(1, { message: 'Rating must be at least 1.' })
  @Max(10, { message: 'Rating cannot exceed 10.' })
  rating: number;

  @IsString({ message: 'Comments must be a string.' })
  @IsNotEmpty({ message: 'Feedback comments are required.' })
  @MinLength(10, { message: 'Comments must be at least 10 characters.' })
  comments: string;

  @IsString({ message: 'Recommendation must be a string.' })
  @IsIn(['SELECT', 'REJECT', 'HOLD'], {
    message: 'Recommendation must be one of: SELECT, REJECT, or HOLD.',
  })
  recommendation: string;
}
