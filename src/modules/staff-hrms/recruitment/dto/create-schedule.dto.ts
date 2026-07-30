import { IsString, IsNotEmpty, IsDateString, MinLength } from 'class-validator';

export class CreateScheduleDto {
  @IsString({ message: 'Candidate ID must be a string.' })
  @IsNotEmpty({ message: 'A candidate must be selected.' })
  candidateId: string;

  @IsString({ message: 'Round name must be a string.' })
  @IsNotEmpty({ message: 'Interview round name is required (e.g. Technical Round 1).' })
  roundName: string;

  @IsDateString({}, { message: 'Scheduled date must be a valid ISO date-time string.' })
  @IsNotEmpty({ message: 'Interview date and time is required.' })
  scheduledAt: string;

  @IsString({ message: 'Panelists must be a string.' })
  @IsNotEmpty({ message: 'At least one panelist name is required.' })
  @MinLength(2, { message: 'Panelist name must be at least 2 characters.' })
  panelists: string;
}
