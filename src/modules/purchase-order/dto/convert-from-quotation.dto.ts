import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ConvertFromQuotationDto {
  @IsOptional()
  @IsString()
  poNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'PO Date must be a valid date string' })
  poDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expected Delivery Date must be a valid date string' })
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  customerPoNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Customer PO Date must be a valid date string' })
  customerPoDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  preparedBy?: string;
}
