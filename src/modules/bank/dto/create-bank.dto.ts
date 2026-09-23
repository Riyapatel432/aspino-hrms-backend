import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateBankDto {
  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  @MaxLength(100, { message: 'Bank name cannot exceed 100 characters' })
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
