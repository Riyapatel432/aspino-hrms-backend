import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsEmail,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuotationItemDto } from './create-quotation.dto';

export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  quotationNumber?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid customer email address' })
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid Indian GSTIN format (e.g. 36AABCU9603R1ZM)',
  })
  gstNo?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Quotation Date must be a valid date string' })
  quotationDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Valid Until must be a valid date string' })
  validUntil?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  customerPoNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Customer PO Date must be a valid date string' })
  customerPoDate?: string;

  @IsOptional()
  @IsString()
  customerPoNotes?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subTotal?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Overall discount percentage must be a number' })
  @Min(0, { message: 'Overall discount cannot be negative' })
  @Max(100, { message: 'Overall discount cannot exceed 100%' })
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  taxType?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percentage must be a number' })
  @Min(0, { message: 'Tax percentage cannot be negative' })
  @Max(100, { message: 'Tax percentage cannot exceed 100%' })
  taxPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Shipping charges must be a number' })
  @Min(0, { message: 'Shipping charges cannot be negative' })
  shippingCharges?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Other charges must be a number' })
  @Min(0, { message: 'Other charges cannot be negative' })
  otherCharges?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  preparedBy?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(1, { message: 'At least one line item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}
