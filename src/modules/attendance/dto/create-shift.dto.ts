import { IsString, IsNotEmpty } from 'class-validator';

export class CreateShiftDto {
  @IsString({ message: 'Shift name must be a string.' })
  @IsNotEmpty({ message: 'Shift name is required (e.g. Morning, Night).' })
  name: string;

  @IsString({ message: 'Start time must be a string.' })
  @IsNotEmpty({ message: 'Shift start time is required (e.g. 09:00).' })
  startTime: string;

  @IsString({ message: 'End time must be a string.' })
  @IsNotEmpty({ message: 'Shift end time is required (e.g. 17:00).' })
  endTime: string;
}
