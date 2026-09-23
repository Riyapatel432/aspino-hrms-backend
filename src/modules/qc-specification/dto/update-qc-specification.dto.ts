import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateQcSpecificationDto {
  @IsString()
  @IsOptional()
  specCode?: string;

  @IsString()
  @IsOptional()
  productMaterialCode?: string;

  @IsString()
  @IsOptional()
  itemName?: string;

  @IsString()
  @IsIn(['PRODUCT', 'PACKING_MATERIAL', 'RAW_MATERIAL'], {
    message: 'Item Type must be PRODUCT, PACKING_MATERIAL, or RAW_MATERIAL',
  })
  @IsOptional()
  itemType?: string;

  @IsOptional()
  testParameters?: any;

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
