import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreateSalaryStructureDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsNumber()
  @IsOptional()
  month?: number;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsNumber()
  @Min(0, { message: 'Basic salary must be greater than or equal to 0' })
  basicSalary: number;

  @IsNumber()
  @Min(0, { message: 'HRA amount cannot be negative' })
  @IsOptional()
  hraAmount?: number;

  @IsNumber()
  @Min(0, { message: 'Dearness Allowance cannot be negative' })
  @IsOptional()
  da?: number;

  @IsNumber()
  @Min(0, { message: 'Conveyance allowance cannot be negative' })
  @IsOptional()
  conveyance?: number;

  @IsNumber()
  @Min(0, { message: 'Special allowance cannot be negative' })
  @IsOptional()
  specialAllowance?: number;

  @IsNumber()
  @Min(0, { message: 'Statutory bonus cannot be negative' })
  @IsOptional()
  statutoryBonus?: number;

  @IsNumber()
  @Min(0, { message: 'Reimbursements cannot be negative' })
  @IsOptional()
  reimbursements?: number;

  @IsNumber()
  @Min(0, { message: 'PF amount cannot be negative' })
  @IsOptional()
  pfAmount?: number;

  @IsNumber()
  @Min(0, { message: 'ESI amount cannot be negative' })
  @IsOptional()
  esiAmount?: number;

  @IsNumber()
  @Min(0, { message: 'PT amount cannot be negative' })
  @IsOptional()
  ptAmount?: number;

  @IsString()
  @IsOptional()
  taxRegime?: string; // OLD, NEW

  @IsNumber()
  @IsOptional()
  bankId?: number;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  ifscCode?: string;

  @IsString()
  @IsOptional()
  panNumber?: string;
}
