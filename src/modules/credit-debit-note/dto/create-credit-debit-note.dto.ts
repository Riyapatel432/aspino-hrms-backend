import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NoteTypeDto {
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
}

export enum NoteStatusDto {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  APPLIED = 'APPLIED',
  CANCELLED = 'CANCELLED',
}

export class CreateCreditDebitNoteItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsNotEmpty({ message: 'Item name is required' })
  @IsString()
  itemName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  uomId?: string;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsNotEmpty({ message: 'Quantity is required' })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.0001, { message: 'Quantity must be greater than zero' })
  quantity: number;

  @IsNotEmpty({ message: 'Unit price is required' })
  @IsNumber({}, { message: 'Unit price must be a number' })
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;

  @IsOptional()
  @IsNumber({}, { message: 'Discount percentage must be a number' })
  @Min(0, { message: 'Discount percentage cannot be negative' })
  discountPercent?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percentage must be a number' })
  @Min(0, { message: 'Tax percentage cannot be negative' })
  taxPercent?: number;

  @IsOptional()
  @IsNumber()
  cgstAmount?: number;

  @IsOptional()
  @IsNumber()
  sgstAmount?: number;

  @IsOptional()
  @IsNumber()
  igstAmount?: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateCreditDebitNoteDto {
  @IsOptional()
  @IsString()
  noteNumber?: string;

  @IsNotEmpty({ message: 'Note type is required' })
  @IsEnum(NoteTypeDto, { message: 'Note type must be CREDIT_NOTE or DEBIT_NOTE' })
  type: NoteTypeDto;

  @IsOptional()
  @IsEnum(NoteStatusDto, { message: 'Invalid status' })
  status?: NoteStatusDto;

  @IsOptional()
  @IsDateString()
  noteDate?: string;

  @IsNotEmpty({ message: 'Reason for Credit/Debit Note is required' })
  @IsString()
  reason: string;

  // Invoice linkage
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  originalInvoiceDate?: string;

  // Parties
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsNotEmpty({ message: 'Party Name is required' })
  @IsString()
  partyName: string;

  @IsOptional()
  @IsString()
  partyEmail?: string;

  @IsOptional()
  @IsString()
  partyPhone?: string;

  @IsOptional()
  @IsString()
  partyAddress?: string;

  @IsOptional()
  @IsString()
  partyGstNo?: string;

  @IsOptional()
  @IsString()
  partyPanNo?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  // Financials
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  subTotal?: number;

  @IsOptional()
  @IsString()
  taxType?: string;

  @IsOptional()
  @IsNumber()
  taxPercentage?: number;

  @IsOptional()
  @IsNumber()
  cgstAmount?: number;

  @IsOptional()
  @IsNumber()
  sgstAmount?: number;

  @IsOptional()
  @IsNumber()
  igstAmount?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  otherCharges?: number;

  @IsOptional()
  @IsNumber()
  roundOff?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  adjustedAmount?: number;

  @IsOptional()
  @IsNumber()
  balanceAmount?: number;

  // Terms and Notes
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  preparedBy?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Items
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one item is required in a Credit/Debit note' })
  @ValidateNested({ each: true })
  @Type(() => CreateCreditDebitNoteItemDto)
  items: CreateCreditDebitNoteItemDto[];
}
