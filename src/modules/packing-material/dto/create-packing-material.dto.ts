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

export class CreatePackingMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'Material Code is required' })
  materialCode: string;

  @IsString()
  @IsIn(['PRIMARY', 'SECONDARY', 'TERTIARY'], {
    message: 'Type must be PRIMARY, SECONDARY, or TERTIARY',
  })
  @IsNotEmpty({ message: 'Type is required' })
  type: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsOptional()
  approvedSuppliers?: any; // Array of supplier codes or objects

  @IsString()
  @IsOptional()
  linkedSpecification?: string;

  @IsString()
  @IsNotEmpty({ message: 'UOM is required' })
  uom: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Standard cost must be a number' })
  @Min(0, { message: 'Standard cost cannot be negative' })
  @IsOptional()
  standardCost?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum stock must be a number' })
  @Min(0, { message: 'Minimum stock cannot be negative' })
  @IsOptional()
  minimumStock?: number;

  @IsString()
  @IsOptional()
  storageCondition?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
