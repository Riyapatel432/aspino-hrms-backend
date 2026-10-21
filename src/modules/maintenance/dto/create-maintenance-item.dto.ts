import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Part Number is required' })
  partNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Item Name is required' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString({ message: 'Category must be a valid text' })
  @IsNotEmpty({ message: 'Category is required' })
  category: any;

  @IsString()
  @IsOptional()
  equipmentLinkage?: string;

  @IsString()
  @IsNotEmpty({ message: 'UOM is required' })
  uom: string;

  @IsString()
  @IsOptional()
  uomId?: string;

  @IsString()
  @IsOptional()
  storageBinRack?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Current stock must be a number' })
  @Min(0, { message: 'Current stock cannot be negative' })
  @IsOptional()
  currentStock?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum stock must be a number' })
  @Min(0, { message: 'Minimum stock cannot be negative' })
  @IsNotEmpty({ message: 'Minimum stock is required' })
  minimumStock: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum stock must be a number' })
  @Min(0, { message: 'Maximum stock cannot be negative' })
  @IsOptional()
  maximumStock?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Reorder quantity must be a number' })
  @Min(0, { message: 'Reorder quantity cannot be negative' })
  @IsOptional()
  reorderQuantity?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Unit cost must be a number' })
  @Min(0, { message: 'Unit cost cannot be negative' })
  @IsOptional()
  unitCost?: number;

  @IsBoolean()
  @IsOptional()
  isPreventiveLinked?: boolean;

  @IsString()
  @IsOptional()
  pmScheduleReference?: string;

  @IsString()
  @IsOptional()
  preferredSupplier?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
