import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQcSpecificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Specification Code is required' })
  specCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Product or Material Code is required' })
  productMaterialCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Item Name is required' })
  itemName: string;

  @IsString()
  @IsIn(['PRODUCT', 'PACKING_MATERIAL', 'RAW_MATERIAL'], {
    message: 'Item Type must be PRODUCT, PACKING_MATERIAL, or RAW_MATERIAL',
  })
  @IsNotEmpty({ message: 'Item Type is required' })
  itemType: string;

  @IsNotEmpty({ message: 'Test parameters are required' })
  testParameters: any; // Array of { parameterName, testMethod, acceptableLimits, uom }

  @IsString()
  @IsOptional()
  testMethod?: string;

  @IsString()
  @IsOptional()
  acceptableLimits?: string;

  @IsString()
  @IsOptional()
  versionNo?: string;

  @IsOptional()
  effectiveDate?: string | Date;

  @IsOptional()
  reviewDate?: string | Date;

  @IsString()
  @IsIn(['ACTIVE', 'DRAFT', 'SUPERSEDED', 'OBSOLETE'], {
    message: 'Status must be ACTIVE, DRAFT, SUPERSEDED, or OBSOLETE',
  })
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  preparedBy?: string;

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
