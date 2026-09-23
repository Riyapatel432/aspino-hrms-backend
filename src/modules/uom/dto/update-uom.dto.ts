import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUomDto {
  @IsString()
  @IsOptional()
  uomCode?: string;

  @IsString()
  @IsOptional()
  uomName?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Conversion factor must be a number' })
  @Min(0.0001, { message: 'Conversion factor must be greater than 0' })
  @IsOptional()
  conversionFactor?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
