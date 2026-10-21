import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsDateString, IsEnum } from 'class-validator';

export class CreateTransporterDto {
  @IsString()
  @IsOptional()
  transporterCode?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  gstin?: string;

  @IsString()
  @IsOptional()
  transporterIdNo?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  transportType?: string;

  @IsDateString()
  @IsOptional()
  agreementStartDate?: string;

  @IsDateString()
  @IsOptional()
  agreementEndDate?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @IsString()
  @IsOptional()
  transporterId?: string;

  @IsNumber()
  @IsOptional()
  capacityWeightKg?: number;

  @IsNumber()
  @IsOptional()
  capacityVolumeCft?: number;

  @IsBoolean()
  @IsOptional()
  isRefrigerated?: boolean;

  @IsNumber()
  @IsOptional()
  minTempCelsius?: number;

  @IsNumber()
  @IsOptional()
  maxTempCelsius?: number;

  @IsDateString()
  @IsOptional()
  insuranceExpiryDate?: string;

  @IsDateString()
  @IsOptional()
  fitnessCertExpiryDate?: string;

  @IsString()
  @IsOptional()
  permitDetails?: string;

  @IsString()
  @IsOptional()
  gpsDeviceId?: string;
}

export class CreateDriverDto {
  @IsString()
  @IsOptional()
  driverCode?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @IsDateString()
  @IsOptional()
  licenseExpiry?: string;

  @IsString()
  @IsOptional()
  transporterId?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;
}

export class CreateRouteDto {
  @IsString()
  @IsOptional()
  routeCode?: string;

  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsNumber()
  @IsOptional()
  distanceKm?: number;

  @IsNumber()
  @IsOptional()
  estimatedTimeHours?: number;

  @IsString()
  @IsOptional()
  transportMode?: string;

  @IsNumber()
  @IsOptional()
  tollCharges?: number;
}

export class CreateShipmentDto {
  @IsString()
  @IsOptional()
  shipmentNumber?: string;

  @IsString()
  @IsOptional()
  type?: string; // INBOUND, OUTBOUND, WAREHOUSE_TRANSFER, CUSTOMER_RETURN, SUPPLIER_RETURN

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  salesOrderId?: string;

  @IsString()
  @IsOptional()
  purchaseOrderId?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderAddress?: string;

  @IsString()
  @IsOptional()
  originWarehouse?: string;

  @IsString()
  @IsOptional()
  receiverName?: string;

  @IsString()
  @IsOptional()
  receiverAddress?: string;

  @IsString()
  @IsOptional()
  destinationWarehouse?: string;

  @IsString()
  @IsOptional()
  transporterId?: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  driverId?: string;

  @IsString()
  @IsOptional()
  routeId?: string;

  @IsString()
  @IsOptional()
  lrNumber?: string;

  @IsDateString()
  @IsOptional()
  lrDate?: string;

  @IsString()
  @IsOptional()
  ewayBillNumber?: string;

  @IsDateString()
  @IsOptional()
  ewayBillDate?: string;

  @IsDateString()
  @IsOptional()
  plannedDispatchDate?: string;

  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsBoolean()
  @IsOptional()
  isTemperatureSensitive?: boolean;

  @IsNumber()
  @IsOptional()
  requiredMinTemp?: number;

  @IsNumber()
  @IsOptional()
  requiredMaxTemp?: number;

  @IsNumber()
  @IsOptional()
  totalPackages?: number;

  @IsNumber()
  @IsOptional()
  grossWeightKg?: number;

  @IsNumber()
  @IsOptional()
  estimatedFreight?: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsOptional()
  items?: any[];
}
