import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePackingMaterialDto {
  @IsString()
  @IsOptional()
  materialCode?: string;

  @IsString()
  @IsIn(['PRIMARY', 'SECONDARY', 'TERTIARY'], {
    message: 'Type must be PRIMARY, SECONDARY, or TERTIARY',
  })
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  approvedSuppliers?: any;

  @IsString()
  @IsOptional()
  linkedSpecification?: string;

  @IsString()
  @IsOptional()
  uom?: string;

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
