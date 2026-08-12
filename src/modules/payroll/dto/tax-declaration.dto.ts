import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class TaxDeclarationDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  financialYear: string;

  @IsString()
  @IsOptional()
  regime?: string; // OLD, NEW

  @IsNumber()
  @IsOptional()
  section80C?: number;

  @IsNumber()
  @IsOptional()
  section80D?: number;

  @IsNumber()
  @IsOptional()
  section80G?: number;

  @IsNumber()
  @IsOptional()
  otherDeductions?: number;
}
