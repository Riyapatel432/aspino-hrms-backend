import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product Code is required' })
  productCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Product Name is required' })
  name: string;

  @IsUUID('all', { message: 'Category must be a valid UUID' })
  @IsNotEmpty({ message: 'Product Category is required' })
  categoryId: string;

  @IsUUID('all', { message: 'Sub-Category must be a valid UUID' })
  @IsOptional()
  subCategoryId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Unit of Measure (UOM) is required' })
  uom: string;

  @IsString()
  @IsNotEmpty({ message: 'Shelf Life is required' })
  shelfLife: string;

  @IsString()
  @IsNotEmpty({ message: 'Storage Condition is required' })
  storageCondition: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Standard Cost must be a number' })
  @Min(0, { message: 'Standard Cost cannot be negative' })
  standardCost: number;

  @IsString()
  @IsNotEmpty({ message: 'HSN Code is required' })
  hsnCode: string;

  @IsString()
  @IsOptional()
  qcSpecification?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
