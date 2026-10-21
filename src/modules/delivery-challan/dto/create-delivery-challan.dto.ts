import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEnum,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ChallanStatusDto {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ChallanTypeDto {
  SUPPLY = 'SUPPLY',
  JOB_WORK = 'JOB_WORK',
  SUPPLY_ON_APPROVAL = 'SUPPLY_ON_APPROVAL',
  LINE_SALE = 'LINE_SALE',
  BRANCH_TRANSFER = 'BRANCH_TRANSFER',
  OTHER = 'OTHER',
}

export class CreateDeliveryChallanItemDto {
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

  @IsNumber({}, { message: 'Quantity must be a valid number' })
  @Min(0.0001, { message: 'Quantity must be greater than 0' })
  quantity: number;

  @IsOptional()
  @IsNumber({}, { message: 'Unit price must be a number' })
  @Min(0, { message: 'Unit price must be 0 or greater' })
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
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

export class CreateDeliveryChallanDto {
  @IsOptional()
  @IsString()
  challanNumber?: string;

  @IsOptional()
  @IsEnum(ChallanStatusDto)
  status?: ChallanStatusDto;

  @IsOptional()
  @IsEnum(ChallanTypeDto)
  challanType?: ChallanTypeDto;

  @IsOptional()
  @IsDateString()
  challanDate?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  poNumber?: string;

  @IsOptional()
  @IsString()
  eWayBillNumber?: string;

  @IsOptional()
  @IsString()
  transportMode?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  transporterName?: string;

  @IsOptional()
  @IsString()
  lrNumber?: string;

  @IsOptional()
  @IsDateString()
  lrDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsNotEmpty({ message: 'Party / Consignee name is required' })
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
  dispatchAddress?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

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
  taxAmount?: number;

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
  otherCharges?: number;

  @IsOptional()
  @IsNumber()
  roundOff?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

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

  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one item is required in the Delivery Challan' })
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryChallanItemDto)
  items: CreateDeliveryChallanItemDto[];
}
