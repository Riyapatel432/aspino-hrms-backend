import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateProductCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Category Code is required' })
  categoryCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Category Name is required' })
  categoryName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
