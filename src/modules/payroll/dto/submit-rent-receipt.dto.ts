import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class SubmitRentReceiptDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  financialYear: string; // e.g. "2026-2027"

  @IsString()
  @IsNotEmpty()
  landlordName: string;

  @IsString()
  @IsOptional()
  landlordPan?: string;

  @IsString()
  @IsNotEmpty()
  landlordAddress: string;

  @IsNumber()
  monthlyRent: number;

  @IsString()
  @IsOptional()
  rentReceiptUrl?: string;
}

export class VerifyRentReceiptDto {
  @IsString()
  @IsNotEmpty()
  status: string; // APPROVED, REJECTED

  @IsString()
  @IsOptional()
  verifiedBy?: string;
}
