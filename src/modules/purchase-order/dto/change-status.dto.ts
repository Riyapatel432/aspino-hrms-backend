import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePurchaseOrderStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsString()
  status: string;
}
