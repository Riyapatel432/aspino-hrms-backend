import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateTrainingDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'An employee must be selected.' })
  employeeId: string;

  @IsString({ message: 'Training name must be a string.' })
  @IsNotEmpty({
    message: 'Training name is required (e.g. GMP Regulatory Compliance).',
  })
  trainingName: string;

  @IsString({ message: 'Training type must be a string.' })
  @IsIn(['COMPLIANCE', 'TECHNICAL', 'SOFT_SKILLS'], {
    message:
      'Training type must be one of: COMPLIANCE, TECHNICAL, or SOFT_SKILLS.',
  })
  trainingType: string;

  @IsDateString(
    {},
    { message: 'Completion date must be a valid date (YYYY-MM-DD).' },
  )
  @IsNotEmpty({ message: 'Training completion date is required.' })
  completionDate: string;

  @IsDateString(
    {},
    { message: 'Expiry date must be a valid date (YYYY-MM-DD).' },
  )
  @IsOptional()
  expiryDate?: string;
}
