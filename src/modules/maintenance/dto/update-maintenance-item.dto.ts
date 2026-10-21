import { PartialType } from '@nestjs/mapped-types';
import { CreateMaintenanceItemDto } from './create-maintenance-item.dto';

export class UpdateMaintenanceItemDto extends PartialType(CreateMaintenanceItemDto) {}
