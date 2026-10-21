import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MaintenanceRequisitionItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Item ID is required' })
  itemId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Requested quantity must be a number' })
  @Min(0.01, { message: 'Requested quantity must be greater than 0' })
  requestedQuantity: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateMaintenanceRequisitionDto {
  @IsString()
  @IsOptional()
  requisitionDate?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsNotEmpty({ message: 'Requester name is required' })
  requesterName: string;

  @IsString()
  @IsOptional()
  requesterEmployeeId?: string;

  @IsString()
  @IsOptional()
  assignedToName?: string;

  @IsString()
  @IsOptional()
  assignedToEmployeeId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Purpose is required' })
  purpose: string;

  @IsString()
  @IsOptional()
  equipmentMachine?: string;

  @IsString()
  @IsOptional()
  workOrderNumber?: string;

  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY', 'PREVENTIVE_MAINTENANCE'], {
    message: 'Invalid priority',
  })
  @IsOptional()
  priority?: any;

  @IsString()
  @IsOptional()
  pmScheduleId?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaintenanceRequisitionItemDto)
  @IsNotEmpty({ message: 'Items array cannot be empty' })
  items: MaintenanceRequisitionItemDto[];
}
