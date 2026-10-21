import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IssueItemDetailDto {
  @IsString()
  @IsNotEmpty({ message: 'Item ID is required' })
  itemId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Quantity issued must be a number' })
  @Min(0.01, { message: 'Quantity issued must be greater than 0' })
  quantityIssued: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateMaintenanceIssueDto {
  @IsString()
  @IsNotEmpty({ message: 'Requisition ID is required' })
  requisitionId: string;

  @IsString()
  @IsNotEmpty({ message: 'Issued By (Store Keeper) is required' })
  issuedBy: string;

  @IsString()
  @IsNotEmpty({ message: 'Received By (Technician/Engineer) is required' })
  receivedBy: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueItemDetailDto)
  @IsNotEmpty({ message: 'Items array cannot be empty' })
  items: IssueItemDetailDto[];
}
