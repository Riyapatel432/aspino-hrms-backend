import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsOptional()
  loanType?: string; // LOAN, SALARY_ADVANCE

  @IsNumber()
  principalAmount: number;

  @IsNumber()
  monthlyInstallment: number;
}
