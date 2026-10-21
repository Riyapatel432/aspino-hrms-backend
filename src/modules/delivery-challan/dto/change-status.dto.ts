import { IsEnum, IsNotEmpty } from 'class-validator';
import { ChallanStatusDto } from './create-delivery-challan.dto';

export class ChangeChallanStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(ChallanStatusDto, { message: 'Invalid status' })
  status: ChallanStatusDto;
}
