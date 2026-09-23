import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum GatePassType {
  INWARD = 'INWARD',
  OUTWARD = 'OUTWARD',
}

export class CreateGatePassDto {
  @IsEnum(GatePassType, {
    message: 'Pass type must be either INWARD or OUTWARD',
  })
  @IsNotEmpty({ message: 'Gate pass type is required' })
  type: GatePassType;

  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Pass category ID is required' })
  categoryId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vehicle number or Entry mode is required' })
  @Matches(/^[A-Z0-9\-\s]{2,20}$/i, {
    message:
      'Vehicle number or entry mode must be valid (e.g. MH-04-JK-8842 or WALKING)',
  })
  vehicleNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Driver name is required' })
  @MinLength(2, { message: 'Driver name must be at least 2 characters' })
  @MaxLength(60, { message: 'Driver name cannot exceed 60 characters' })
  driverName: string;

  @IsString()
  @IsNotEmpty({ message: 'Driver contact is required' })
  @Matches(/^[+0-9\s-]{8,15}$/, {
    message: 'Driver contact must be a valid phone number (8-15 digits)',
  })
  driverContact: string;

  @IsString()
  @IsNotEmpty({ message: 'Transporter name is required' })
  @MaxLength(80, { message: 'Transporter name cannot exceed 80 characters' })
  transporterName: string;

  // Inward specific
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Supplier source cannot exceed 100 characters' })
  supplierSource?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, {
    message: 'Delivery Challan Number cannot exceed 50 characters',
  })
  deliveryChallanNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Declared quantity cannot exceed 50 characters' })
  declaredQuantity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'PO Number cannot exceed 50 characters' })
  poNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'GRN Number cannot exceed 50 characters' })
  grnNumber?: string;

  // Outward specific
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Invoice Number cannot exceed 50 characters' })
  invoiceNumber?: string;

  @IsBoolean({ message: 'coaGenerated must be a boolean flag' })
  @IsOptional()
  coaGenerated?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(150, {
    message: 'Purpose description cannot exceed 150 characters',
  })
  purpose?: string;

  @IsString()
  @IsOptional()
  @MaxLength(250, { message: 'Notes cannot exceed 250 characters' })
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
