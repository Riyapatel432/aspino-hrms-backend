import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateAppraisalCycleDto {
  @IsString({ message: 'Cycle name must be a string.' })
  @IsNotEmpty({ message: 'Appraisal cycle name is required (e.g. Annual Appraisal FY26).' })
  name: string;

  @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Cycle start date is required.' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Cycle end date is required.' })
  endDate: string;
}
