import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateHolidayDto {
  @IsString({ message: 'Holiday name must be a string.' })
  @IsNotEmpty({ message: 'Holiday name is required.' })
  name: string;

  @IsDateString({}, { message: 'Date must be a valid date (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Holiday date is required.' })
  date: string;
}
