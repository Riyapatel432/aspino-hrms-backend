import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsEmail,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
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

  @IsNotEmpty({ message: 'Quantity is required' })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.0001, { message: 'Quantity must be greater than zero' })
  quantity: number;

  @IsNotEmpty({ message: 'Unit price is required' })
  @IsNumber({}, { message: 'Unit price must be a number' })
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;

  @IsOptional()
  @IsNumber({}, { message: 'Discount percent must be a number' })
  @Min(0, { message: 'Discount cannot be negative' })
  @Max(100, { message: 'Discount cannot exceed 100%' })
  discountPercent?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percent must be a number' })
  @Min(0, { message: 'Tax cannot be negative' })
  @Max(100, { message: 'Tax cannot exceed 100%' })
  taxPercent?: number;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  poNumber?: string;

  @IsOptional()
  @IsString()
  type?: string; // 'PROCUREMENT' | 'SALES'

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString({}, { message: 'PO Date must be a valid date string' })
  poDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expected Delivery Date must be a valid date string' })
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsNotEmpty({ message: 'Party Name is required' })
  @IsString()
  partyName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
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
  billingAddress?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subTotal?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Discount percentage must be a number' })
  @Min(0)
  @Max(100)
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
  @Min(0)
  @Max(100)
  taxPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCharges?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
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

  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one line item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
