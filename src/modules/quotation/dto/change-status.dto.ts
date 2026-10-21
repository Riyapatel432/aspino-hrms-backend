import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeQuotationStatusDto {
  @IsNotEmpty()
  @IsString()
  status: string; // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED
}
