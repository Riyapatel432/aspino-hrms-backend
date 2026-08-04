import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @IsString({ message: 'Candidate ID must be a string.' })
  @IsNotEmpty({ message: 'A candidate must be selected for the offer.' })
  candidateId: string;

  @IsString({ message: 'Role/designation must be a string.' })
  @IsNotEmpty({ message: 'The offered role / designation is required.' })
  role: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Salary CTC must be a number.' })
  @Min(1, { message: 'Annual CTC must be greater than 0.' })
  salary: number;

  @IsDateString(
    {},
    { message: 'Joining date must be a valid date (YYYY-MM-DD).' },
  )
  @IsNotEmpty({ message: 'Expected joining date is required.' })
  joiningDate: string;
}
