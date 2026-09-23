import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProductCategoryDto {
  @IsString()
  @IsOptional()
  categoryCode?: string;

  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
