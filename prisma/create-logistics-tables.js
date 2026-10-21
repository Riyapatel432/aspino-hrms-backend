const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Creating Logistics tables if not exist ---');
    await client.query('BEGIN');

    // 1. Enums
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentType') THEN
          CREATE TYPE "ShipmentType" AS ENUM ('INBOUND', 'OUTBOUND', 'WAREHOUSE_TRANSFER', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShipmentStatus') THEN
          CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'PLANNED', 'APPROVED', 'PICKING', 'PACKED', 'READY_FOR_DISPATCH', 'IN_TRANSIT', 'ARRIVED', 'RECEIVED', 'DELIVERED', 'ON_HOLD', 'CLOSED', 'CANCELLED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransportMode') THEN
          CREATE TYPE "TransportMode" AS ENUM ('ROAD', 'AIR', 'RAIL', 'SEA', 'COURIER');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VehicleStatus') THEN
          CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'DECOMMISSIONED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DriverStatus') THEN
          CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'ON_DUTY', 'ON_LEAVE', 'INACTIVE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RateType') THEN
          CREATE TYPE "RateType" AS ENUM ('PER_KG', 'PER_KM', 'PER_BOX', 'PER_TRIP', 'FLAT_RATE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ColdChainExcursionSeverity') THEN
          CREATE TYPE "ColdChainExcursionSeverity" AS ENUM ('LOW', 'MEDIUM', 'CRITICAL');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ColdChainActionStatus') THEN
          CREATE TYPE "ColdChainActionStatus" AS ENUM ('PENDING', 'INVESTIGATING', 'QA_HOLD', 'RELEASED', 'DESTROYED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransferStatus') THEN
          CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'DISPATCHED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReturnType') THEN
          CREATE TYPE "ReturnType" AS ENUM ('CUSTOMER_RETURN', 'SUPPLIER_RETURN');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReturnReason') THEN
          CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED_PRODUCT', 'EXPIRED_PRODUCT', 'INCORRECT_PRODUCT', 'INCORRECT_QUANTITY', 'QUALITY_COMPLAINT', 'DELIVERY_REJECTION', 'RECALL', 'OTHER');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReturnDisposition') THEN
          CREATE TYPE "ReturnDisposition" AS ENUM ('PENDING_INSPECTION', 'APPROVED_FOR_RESTOCK', 'RETURN_TO_SUPPLIER', 'REJECTED', 'DESTRUCTION', 'FURTHER_INVESTIGATION');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FreightPaymentStatus') THEN
          CREATE TYPE "FreightPaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'APPROVED', 'PAID', 'DISPUTED');
        END IF;
      END$$;
    `);
    console.log('✅ Logistics enums created or verified.');

    // 2. Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Transporter" (
        "id" TEXT NOT NULL,
        "transporterCode" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "gstin" TEXT,
        "transporterIdNo" TEXT,
        "contactPerson" TEXT,
        "phone" TEXT,
        "email" TEXT,
        "address" TEXT,
        "city" TEXT,
        "state" TEXT,
        "pincode" TEXT,
        "transportType" TEXT DEFAULT 'ROAD',
        "agreementStartDate" TIMESTAMP(3),
        "agreementEndDate" TIMESTAMP(3),
        "rating" DOUBLE PRECISION DEFAULT 5.0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "remarks" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Transporter_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Transporter_transporterCode_key" ON "Transporter"("transporterCode");

      CREATE TABLE IF NOT EXISTS "LogisticsVehicle" (
        "id" TEXT NOT NULL,
        "vehicleNumber" TEXT NOT NULL,
        "vehicleType" TEXT NOT NULL,
        "transporterId" TEXT,
        "capacityWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 1000,
        "capacityVolumeCft" DOUBLE PRECISION DEFAULT 100,
        "isRefrigerated" BOOLEAN NOT NULL DEFAULT false,
        "minTempCelsius" DOUBLE PRECISION,
        "maxTempCelsius" DOUBLE PRECISION,
        "insuranceExpiryDate" TIMESTAMP(3),
        "fitnessCertExpiryDate" TIMESTAMP(3),
        "permitDetails" TEXT,
        "gpsDeviceId" TEXT,
        "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsVehicle_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsVehicle_vehicleNumber_key" ON "LogisticsVehicle"("vehicleNumber");

      CREATE TABLE IF NOT EXISTS "LogisticsDriver" (
        "id" TEXT NOT NULL,
        "driverCode" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "licenseNumber" TEXT NOT NULL,
        "licenseExpiry" TIMESTAMP(3),
        "transporterId" TEXT,
        "emergencyPhone" TEXT,
        "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsDriver_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsDriver_driverCode_key" ON "LogisticsDriver"("driverCode");
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsDriver_licenseNumber_key" ON "LogisticsDriver"("licenseNumber");

      CREATE TABLE IF NOT EXISTS "LogisticsRoute" (
        "id" TEXT NOT NULL,
        "routeCode" TEXT NOT NULL,
        "origin" TEXT NOT NULL,
        "destination" TEXT NOT NULL,
        "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "estimatedTimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "transportMode" "TransportMode" NOT NULL DEFAULT 'ROAD',
        "tollCharges" DOUBLE PRECISION DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsRoute_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsRoute_routeCode_key" ON "LogisticsRoute"("routeCode");

      CREATE TABLE IF NOT EXISTS "FreightRate" (
        "id" TEXT NOT NULL,
        "transporterId" TEXT NOT NULL,
        "routeId" TEXT,
        "vehicleType" TEXT,
        "rateType" "RateType" NOT NULL DEFAULT 'PER_KG',
        "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "minimumCharge" DOUBLE PRECISION DEFAULT 0,
        "additionalCharges" DOUBLE PRECISION DEFAULT 0,
        "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "effectiveTo" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FreightRate_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "LogisticsShipment" (
        "id" TEXT NOT NULL,
        "shipmentNumber" TEXT NOT NULL,
        "type" "ShipmentType" NOT NULL DEFAULT 'OUTBOUND',
        "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
        "priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "salesOrderId" TEXT,
        "purchaseOrderId" TEXT,
        "deliveryChallanId" TEXT,
        "invoiceId" TEXT,
        "gatePassId" TEXT,
        "senderName" TEXT NOT NULL,
        "senderAddress" TEXT,
        "originWarehouse" TEXT,
        "receiverName" TEXT NOT NULL,
        "receiverAddress" TEXT,
        "destinationWarehouse" TEXT,
        "transporterId" TEXT,
        "vehicleId" TEXT,
        "driverId" TEXT,
        "routeId" TEXT,
        "lrNumber" TEXT,
        "lrDate" TIMESTAMP(3),
        "ewayBillNumber" TEXT,
        "ewayBillDate" TIMESTAMP(3),
        "ewayBillValidUntil" TIMESTAMP(3),
        "plannedDispatchDate" TIMESTAMP(3),
        "actualDispatchDate" TIMESTAMP(3),
        "expectedDeliveryDate" TIMESTAMP(3),
        "actualDeliveryDate" TIMESTAMP(3),
        "isTemperatureSensitive" BOOLEAN NOT NULL DEFAULT false,
        "requiredMinTemp" DOUBLE PRECISION,
        "requiredMaxTemp" DOUBLE PRECISION,
        "currentRecordedTemp" DOUBLE PRECISION,
        "temperatureLoggerId" TEXT,
        "hasTemperatureExcursion" BOOLEAN NOT NULL DEFAULT false,
        "totalPackages" INTEGER NOT NULL DEFAULT 1,
        "grossWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "netWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "estimatedFreight" DOUBLE PRECISION DEFAULT 0,
        "actualFreight" DOUBLE PRECISION DEFAULT 0,
        "podReceived" BOOLEAN NOT NULL DEFAULT false,
        "podReceivedDate" TIMESTAMP(3),
        "podReceiverName" TEXT,
        "podRemarks" TEXT,
        "podDocumentUrl" TEXT,
        "remarks" TEXT,
        "dispatchedBy" TEXT,
        "approvedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsShipment_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsShipment_shipmentNumber_key" ON "LogisticsShipment"("shipmentNumber");

      CREATE TABLE IF NOT EXISTS "LogisticsShipmentItem" (
        "id" TEXT NOT NULL,
        "shipmentId" TEXT NOT NULL,
        "productId" TEXT,
        "productCode" TEXT,
        "productName" TEXT NOT NULL,
        "batchNumber" TEXT,
        "manufacturingDate" TIMESTAMP(3),
        "expiryDate" TIMESTAMP(3),
        "orderedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "shippedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "receivedQuantity" DOUBLE PRECISION DEFAULT 0,
        "shortageQuantity" DOUBLE PRECISION DEFAULT 0,
        "damagedQuantity" DOUBLE PRECISION DEFAULT 0,
        "uom" TEXT DEFAULT 'NOS',
        "cartonNumber" TEXT,
        "palletNumber" TEXT,
        "packageSealNo" TEXT,
        "unitPrice" DOUBLE PRECISION DEFAULT 0,
        "qaReleaseStatus" TEXT DEFAULT 'RELEASED',
        "remarks" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsShipmentItem_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "LogisticsTrackingEvent" (
        "id" TEXT NOT NULL,
        "shipmentId" TEXT NOT NULL,
        "status" "ShipmentStatus" NOT NULL,
        "locationName" TEXT NOT NULL,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "eventDetails" TEXT,
        "recordedBy" TEXT,
        "remarks" TEXT,
        "latitude" DOUBLE PRECISION,
        "longitude" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsTrackingEvent_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "LogisticsTemperatureLog" (
        "id" TEXT NOT NULL,
        "shipmentId" TEXT NOT NULL,
        "loggerId" TEXT,
        "temperature" DOUBLE PRECISION NOT NULL,
        "humidity" DOUBLE PRECISION,
        "readingTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isExcursion" BOOLEAN NOT NULL DEFAULT false,
        "locationStamp" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsTemperatureLog_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "LogisticsTemperatureExcursion" (
        "id" TEXT NOT NULL,
        "shipmentId" TEXT NOT NULL,
        "excursionNumber" TEXT NOT NULL,
        "severity" "ColdChainExcursionSeverity" NOT NULL DEFAULT 'MEDIUM',
        "minRecordedTemp" DOUBLE PRECISION NOT NULL,
        "maxRecordedTemp" DOUBLE PRECISION NOT NULL,
        "allowableMinTemp" DOUBLE PRECISION NOT NULL,
        "allowableMaxTemp" DOUBLE PRECISION NOT NULL,
        "durationMinutes" INTEGER NOT NULL DEFAULT 0,
        "timeDetected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "investigationStatus" "ColdChainActionStatus" NOT NULL DEFAULT 'PENDING',
        "qaReviewRemarks" TEXT,
        "correctiveAction" TEXT,
        "dispositionAction" TEXT,
        "qaOfficerName" TEXT,
        "qaSignoffDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsTemperatureExcursion_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsTemperatureExcursion_excursionNumber_key" ON "LogisticsTemperatureExcursion"("excursionNumber");

      CREATE TABLE IF NOT EXISTS "WarehouseTransferRequest" (
        "id" TEXT NOT NULL,
        "transferNumber" TEXT NOT NULL,
        "sourceWarehouse" TEXT NOT NULL,
        "destinationWarehouse" TEXT NOT NULL,
        "requiredDate" TIMESTAMP(3),
        "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
        "reason" TEXT,
        "requestedBy" TEXT NOT NULL,
        "approvedBy" TEXT,
        "dispatchedDate" TIMESTAMP(3),
        "receivedDate" TIMESTAMP(3),
        "shipmentNumberRef" TEXT,
        "notes" TEXT,
        "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WarehouseTransferRequest_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseTransferRequest_transferNumber_key" ON "WarehouseTransferRequest"("transferNumber");

      CREATE TABLE IF NOT EXISTS "LogisticsReturn" (
        "id" TEXT NOT NULL,
        "returnNumber" TEXT NOT NULL,
        "returnType" "ReturnType" NOT NULL DEFAULT 'CUSTOMER_RETURN',
        "partyName" TEXT NOT NULL,
        "originalInvoiceNo" TEXT,
        "originalShipmentNo" TEXT,
        "reason" "ReturnReason" NOT NULL DEFAULT 'DAMAGED_PRODUCT',
        "disposition" "ReturnDisposition" NOT NULL DEFAULT 'PENDING_INSPECTION',
        "status" TEXT NOT NULL DEFAULT 'REQUESTED',
        "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "totalReturnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "quarantinedLocation" TEXT DEFAULT 'Quarantine Bay Q-01',
        "qaInspectionRemarks" TEXT,
        "qaInspector" TEXT,
        "qaInspectionDate" TIMESTAMP(3),
        "creditDebitNoteNumber" TEXT,
        "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsReturn_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsReturn_returnNumber_key" ON "LogisticsReturn"("returnNumber");

      CREATE TABLE IF NOT EXISTS "FreightEntry" (
        "id" TEXT NOT NULL,
        "invoiceNumber" TEXT NOT NULL,
        "shipmentId" TEXT,
        "transporterId" TEXT NOT NULL,
        "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "baseFreightAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "loadingCharges" DOUBLE PRECISION DEFAULT 0,
        "unloadingCharges" DOUBLE PRECISION DEFAULT 0,
        "fuelSurcharge" DOUBLE PRECISION DEFAULT 0,
        "detentionCharges" DOUBLE PRECISION DEFAULT 0,
        "tollCharges" DOUBLE PRECISION DEFAULT 0,
        "otherCharges" DOUBLE PRECISION DEFAULT 0,
        "taxAmount" DOUBLE PRECISION DEFAULT 0,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "paymentStatus" "FreightPaymentStatus" NOT NULL DEFAULT 'PENDING',
        "approvedBy" TEXT,
        "remarks" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FreightEntry_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "FreightEntry_invoiceNumber_key" ON "FreightEntry"("invoiceNumber");

      CREATE TABLE IF NOT EXISTS "LogisticsDocument" (
        "id" TEXT NOT NULL,
        "documentNumber" TEXT NOT NULL,
        "documentType" TEXT NOT NULL,
        "shipmentId" TEXT,
        "title" TEXT NOT NULL,
        "fileUrl" TEXT,
        "version" TEXT NOT NULL DEFAULT 'v1.0',
        "uploadedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LogisticsDocument_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsDocument_documentNumber_key" ON "LogisticsDocument"("documentNumber");
    `);

    // Seed initial mock masters if Transporter table is empty
    const checkTransporters = await client.query('SELECT COUNT(*) FROM "Transporter";');
    if (parseInt(checkTransporters.rows[0].count, 10) === 0) {
      console.log('Seeding initial Transporters and Vehicles...');
      await client.query(`
        INSERT INTO "Transporter" ("id", "transporterCode", "name", "gstin", "contactPerson", "phone", "email", "city", "state", "transportType", "rating", "isActive") VALUES
        ('t-01', 'TRP-BLUEDART', 'Blue Dart Express Ltd (Pharma Cold Chain)', '27AAACB0565F1Z2', 'Ramesh Patil', '+91 98201 12345', 'pharma@bluedart.com', 'Mumbai', 'Maharashtra', 'MULTIMODAL', 4.9, true),
        ('t-02', 'TRP-VRL', 'VRL Logistics Cold Hub', '29AAACV5623K1ZG', 'Sunil Deshmukh', '+91 94480 54321', 'pharma.south@vrllogistics.com', 'Hubballi', 'Karnataka', 'ROAD', 4.7, true),
        ('t-03', 'TRP-SAFE-EXP', 'Safexpress Pharma Network', '07AAACS6112P1ZN', 'Vikram Seth', '+91 98110 99887', 'support@safexpress.com', 'New Delhi', 'Delhi', 'ROAD', 4.8, true)
        ON CONFLICT ("transporterCode") DO NOTHING;

        INSERT INTO "LogisticsVehicle" ("id", "vehicleNumber", "vehicleType", "transporterId", "capacityWeightKg", "isRefrigerated", "minTempCelsius", "maxTempCelsius", "status", "isActive") VALUES
        ('v-01', 'MH-04-CP-8921', 'Reefer Van (2-8°C)', 't-01', 3500, true, 2.0, 8.0, 'AVAILABLE', true),
        ('v-02', 'KA-25-D-4412', 'Insulated Reefer 32ft', 't-02', 9000, true, 15.0, 25.0, 'AVAILABLE', true),
        ('v-03', 'DL-01-AX-9910', 'Closed Container 20ft', 't-03', 6000, false, NULL, NULL, 'AVAILABLE', true)
        ON CONFLICT ("vehicleNumber") DO NOTHING;

        INSERT INTO "LogisticsDriver" ("id", "driverCode", "name", "phone", "licenseNumber", "transporterId", "status", "isActive") VALUES
        ('d-01', 'DRV-001', 'Kailash Yadav', '+91 98765 11223', 'MH0420180092110', 't-01', 'ACTIVE', true),
        ('d-02', 'DRV-002', 'Praveen Gowda', '+91 98860 33445', 'KA2520190045231', 't-02', 'ACTIVE', true)
        ON CONFLICT ("licenseNumber") DO NOTHING;

        INSERT INTO "LogisticsRoute" ("id", "routeCode", "origin", "destination", "distanceKm", "estimatedTimeHours", "transportMode") VALUES
        ('r-01', 'RT-MUM-BLR', 'Central Plant (Ahmedabad / Mumbai)', 'South Distribution Hub (Bangalore)', 980, 22.5, 'ROAD'),
        ('r-02', 'RT-MUM-DEL', 'Central Plant (Ahmedabad / Mumbai)', 'North Warehouse Hub (Delhi NCR)', 1420, 28.0, 'ROAD')
        ON CONFLICT ("routeCode") DO NOTHING;

        INSERT INTO "LogisticsShipment" (
          "id", "shipmentNumber", "type", "status", "priority", "senderName", "originWarehouse",
          "receiverName", "destinationWarehouse", "transporterId", "vehicleId", "driverId",
          "lrNumber", "ewayBillNumber", "isTemperatureSensitive", "requiredMinTemp", "requiredMaxTemp",
          "currentRecordedTemp", "totalPackages", "grossWeightKg", "estimatedFreight", "actualFreight"
        ) VALUES (
          'shp-01', 'SHP-2026-0001', 'OUTBOUND', 'IN_TRANSIT', 'COLD_CHAIN',
          'Aspino Pharmaceuticals Main Plant', 'Finished Goods Bay FG-02',
          'Apollo Hospitals Central Medical Store', 'Apollo Hub Hyderabad',
          't-01', 'v-01', 'd-01', 'LR-BD-9021', 'EWB-2026-991201', true, 2.0, 8.0, 4.5,
          45, 1250, 28500, 28500
        ) ON CONFLICT ("shipmentNumber") DO NOTHING;

        INSERT INTO "LogisticsShipmentItem" (
          "id", "shipmentId", "productCode", "productName", "batchNumber", "orderedQuantity", "shippedQuantity", "uom", "qaReleaseStatus"
        ) VALUES (
          'it-01', 'shp-01', 'PRD-PCM-650', 'Paracetamol 650mg Tablets', 'BAT-2026-080', 5000, 5000, 'STRIPS', 'RELEASED'
        ) ON CONFLICT ("id") DO NOTHING;

        INSERT INTO "LogisticsTrackingEvent" ("id", "shipmentId", "status", "locationName", "eventDetails", "recordedBy") VALUES
          ('evt-01', 'shp-01', 'PICKING', 'Central Plant FG Store', 'Cartons picked and checked against packing slip', 'Store Keeper'),
          ('evt-02', 'shp-01', 'IN_TRANSIT', 'Pune Toll Expressway', 'Vehicle departed and en-route. Temp maintained at 4.5°C', 'Driver GPS');
      `);
      console.log('✅ Seeded demo logistics records.');
    }

    await client.query('COMMIT');
    console.log('✅ All Logistics database tables successfully configured.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error executing logistics table setup:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
