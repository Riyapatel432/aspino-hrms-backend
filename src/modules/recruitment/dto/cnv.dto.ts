import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  MinLength,
} from 'class-validator';

export class RecordCnvSubmissionDto {
  @IsString({ message: 'Employment exchange / authority name is required.' })
  @IsNotEmpty({ message: 'Employment exchange / authority name is required.' })
  @MinLength(3, {
    message: 'Employment exchange name must be at least 3 characters.',
  })
  employmentExchangeOffice: string;

  @IsDateString({}, { message: 'Notification date must be a valid date.' })
  @IsNotEmpty({
    message: 'Notification date is required when recording submission.',
  })
  notificationDate: string;

  @IsString({ message: 'Please select a valid submission mode.' })
  @IsNotEmpty({ message: 'Submission mode is required.' })
  submissionMode: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  cnvRemarks?: string;

  @IsOptional()
  @IsString()
  submittedBy?: string;
}

export class RecordCnvAcknowledgementDto {
  @IsString({ message: 'Acknowledgement number is required.' })
  @IsNotEmpty({ message: 'Acknowledgement number is required.' })
  acknowledgementNumber: string;

  @IsDateString({}, { message: 'Acknowledgement date must be a valid date.' })
  @IsNotEmpty({ message: 'Acknowledgement date is required.' })
  acknowledgementDate: string;

  @IsOptional()
  @IsString()
  acknowledgementDocumentUrl?: string;

  @IsOptional()
  @IsString()
  cnvRemarks?: string;

  @IsOptional()
  @IsString()
  acknowledgedBy?: string;
}
