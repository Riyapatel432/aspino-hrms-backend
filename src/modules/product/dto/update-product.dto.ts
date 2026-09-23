import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  productCode?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID('all', { message: 'Category must be a valid UUID' })
  @IsOptional()
  categoryId?: string;

  @IsUUID('all', { message: 'Sub-Category must be a valid UUID' })
  @IsOptional()
  subCategoryId?: string;

  @IsString()
  @IsOptional()
  uom?: string;

  @IsString()
  @IsOptional()
  shelfLife?: string;

  @IsString()
  @IsOptional()
  storageCondition?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Standard Cost must be a number' })
  @Min(0, { message: 'Standard Cost cannot be negative' })
  @IsOptional()
  standardCost?: number;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsString()
  @IsOptional()
  qcSpecification?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
