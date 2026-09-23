import {
  IsOptional,
  IsString,
  IsArray,
  IsEmail,
  Min,
  Max,
  IsNumber,
} from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  gstNo?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  approvedCategories?: string[];

  @IsString()
  @IsOptional()
  approvalStatus?: string;

  @IsOptional()
  bankId?: number | string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  ifscCode?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsNumber()
  @IsOptional()
  @Min(1.0)
  @Max(5.0)
  rating?: number;

  @IsString()
  @IsOptional()
  history?: string;
}
