import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRequisitionDto {
  @IsString({ message: 'Job title must be a string.' })
  @IsNotEmpty({ message: 'Job title is required.' })
  @MinLength(3, { message: 'Job title must be at least 3 characters.' })
  title: string;

  @IsString({ message: 'Department ID must be a string.' })
  @IsNotEmpty({ message: 'A department must be selected.' })
  departmentId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Headcount must be a number.' })
  @Min(1, { message: 'Headcount must be at least 1.' })
  headcount: number;

  @IsString({ message: 'Justification must be a string.' })
  @IsNotEmpty({ message: 'Justification / business reason is required.' })
  @MinLength(10, { message: 'Justification must be at least 10 characters.' })
  justification: string;

  @IsString({ message: 'Raised by must be a string.' })
  @IsNotEmpty({ message: 'The requester name (Raised By) is required.' })
  raisedBy: string;
}
