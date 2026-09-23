import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateProductSubCategoryDto {
  @IsString()
  @IsOptional()
  subCategoryCode?: string;

  @IsString()
  @IsOptional()
  subCategoryName?: string;

  @IsUUID('all', { message: 'Linked Category ID must be a valid UUID' })
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
