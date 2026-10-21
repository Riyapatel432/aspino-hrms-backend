import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ConvertFromQuotationDto {
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  deliveryMode?: string;

  @IsOptional()
  @IsString()
  truckNumber?: string;
}
