import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateBankDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Bank name cannot exceed 100 characters' })
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
