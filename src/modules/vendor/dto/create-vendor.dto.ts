import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty({ message: 'Vendor code is required' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Vendor name is required' })
  @Matches(/^[^0-9]+$/, { message: 'Numbers are not allowed in Vendor Name' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Service type is required' })
  serviceType!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[^0-9]+$/, { message: 'Numbers are not allowed in Contact Name' })
  contactName?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  contractReference?: string;

  @IsString()
  @IsOptional()
  approvalStatus?: string;
}
