import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum GatePassType {
  INWARD = 'INWARD',
  OUTWARD = 'OUTWARD',
}

export class CreatePassCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  @MaxLength(60, { message: 'Category name cannot exceed 60 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Category code is required' })
  @Matches(/^[A-Z0-9_]{2,20}$/, {
    message:
      'Category code must contain only uppercase letters, numbers, or underscores (e.g. IN_MAT, OUT_SALES)',
  })
  code: string;

  @IsEnum(GatePassType, { message: 'Type must be either INWARD or OUTWARD' })
  @IsNotEmpty({ message: 'Type (INWARD/OUTWARD) is required' })
  type: GatePassType;

  @IsString()
  @IsOptional()
  @MaxLength(250, { message: 'Description cannot exceed 250 characters' })
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
