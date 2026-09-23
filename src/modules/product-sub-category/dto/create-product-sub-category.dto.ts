import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateProductSubCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Sub-Category Code is required' })
  subCategoryCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Sub-Category Name is required' })
  subCategoryName: string;

  @IsUUID('all', { message: 'Linked Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Linked Category is required' })
  categoryId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
