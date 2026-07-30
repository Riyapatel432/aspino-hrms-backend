import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateCandidateDto {
  @IsString({ message: 'Candidate name must be a string.' })
  @IsNotEmpty({ message: 'Candidate full name is required.' })
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString({ message: 'Phone must be a string.' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'Resume / CV file path must be a string.' })
  @IsNotEmpty({ message: 'Resume / CV (PDF) is required.' })
  resumeUrl: string;

  @IsString({ message: 'Sourcing channel must be a string.' })
  @IsNotEmpty({ message: 'Sourcing source is required (e.g. Portal, Referral).' })
  source: string;

  @IsString({ message: 'Job Requisition ID must be a string.' })
  @IsNotEmpty({ message: 'A linked Job Requisition must be selected.' })
  requisitionId: string;
}
