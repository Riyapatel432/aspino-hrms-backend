import { IsEnum, IsNotEmpty } from 'class-validator';

export class ChangeInvoiceStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'], {
    message: 'Invalid invoice status',
  })
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
}
