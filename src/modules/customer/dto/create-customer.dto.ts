import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer code is required' })
  customerCode!: string;

  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  name!: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  gstNo?: string;

  @IsString()
  @IsOptional()
  creditTerms?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  customerType?: string; // 'DOMESTIC' | 'EXPORT'

  @IsBoolean()
  @IsOptional()
  isDomestic?: boolean;

  @IsString()
  @IsOptional()
  country?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
