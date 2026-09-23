import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateStorageLocationDto {
  @IsString()
  @IsOptional()
  locationCode?: string;

  @IsString()
  @IsOptional()
  locationName?: string;

  @IsString()
  @IsOptional()
  warehouse?: string;

  @IsString()
  @IsIn(
    ['AMBIENT', 'COOL', 'COLD_CHAIN', 'FROZEN', 'CONTROLLED_ROOM_TEMPERATURE'],
    {
      message:
        'Storage condition must be AMBIENT, COOL, COLD_CHAIN, FROZEN, or CONTROLLED_ROOM_TEMPERATURE',
    },
  )
  @IsOptional()
  storageCondition?: string;

  @IsString()
  @IsOptional()
  capacity?: string;

  @IsString()
  @IsIn(
    [
      'RAW_MATERIAL_STORE',
      'PACKAGING_STORE',
      'FINISHED_GOODS_STORE',
      'QUARANTINE_STORE',
      'REJECTION_STORE',
      'IN_TRANSIT_STORE',
    ],
    {
      message:
        'Linked Store Type must be RAW_MATERIAL_STORE, PACKAGING_STORE, FINISHED_GOODS_STORE, QUARANTINE_STORE, REJECTION_STORE, or IN_TRANSIT_STORE',
    },
  )
  @IsOptional()
  linkedStoreType?: string;

  @IsString()
  @IsOptional()
  temperatureRange?: string;

  @IsString()
  @IsOptional()
  humidityRange?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
