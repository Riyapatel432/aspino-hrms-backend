import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class InitiatePayrollRunDto {
  @IsNumber()
  month: number;

  @IsNumber()
  year: number;
}

export class ApprovePayrollRunDto {
  @IsString()
  @IsOptional()
  approvedBy?: string;
}
