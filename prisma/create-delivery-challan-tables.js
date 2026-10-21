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
    console.log('--- Creating Delivery Challan tables ---');
    await client.query('BEGIN');

    // 1. Create Enums if not exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChallanStatus') THEN
          CREATE TYPE "ChallanStatus" AS ENUM ('DRAFT', 'ISSUED', 'DELIVERED', 'CANCELLED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChallanType') THEN
          CREATE TYPE "ChallanType" AS ENUM ('SUPPLY', 'JOB_WORK', 'SUPPLY_ON_APPROVAL', 'LINE_SALE', 'BRANCH_TRANSFER', 'OTHER');
        END IF;
      END$$;
    `);
    console.log('✅ ChallanStatus and ChallanType enums verified');

    // 2. Create DeliveryChallan table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DeliveryChallan" (
        "id" TEXT NOT NULL,
        "challanNumber" TEXT NOT NULL,
        "status" "ChallanStatus" NOT NULL DEFAULT 'DRAFT',
        "challanType" "ChallanType" NOT NULL DEFAULT 'SUPPLY',
        "challanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        "invoiceId" TEXT,
        "invoiceNumber" TEXT,
        "poNumber" TEXT,
        "eWayBillNumber" TEXT,

        "transportMode" TEXT,
        "vehicleNumber" TEXT,
        "transporterName" TEXT,
        "lrNumber" TEXT,
        "lrDate" TIMESTAMP(3),

        "customerId" TEXT,
        "supplierId" TEXT,
        "vendorId" TEXT,

        "partyName" TEXT NOT NULL,
        "partyEmail" TEXT,
        "partyPhone" TEXT,
        "partyAddress" TEXT,
        "partyGstNo" TEXT,
        "partyPanNo" TEXT,

        "dispatchAddress" TEXT,
        "shippingAddress" TEXT,
        "placeOfSupply" TEXT,

        "currency" TEXT NOT NULL DEFAULT 'INR',
        "subTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxType" TEXT NOT NULL DEFAULT 'GST',
        "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

        "termsAndConditions" TEXT,
        "notes" TEXT,
        "documentUrl" TEXT,

        "preparedBy" TEXT,
        "approvedBy" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "DeliveryChallan_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ DeliveryChallan table verified');

    // 3. Create DeliveryChallan indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryChallan_challanNumber_key" ON "DeliveryChallan"("challanNumber");
      CREATE INDEX IF NOT EXISTS "DeliveryChallan_challanNumber_idx" ON "DeliveryChallan"("challanNumber");
      CREATE INDEX IF NOT EXISTS "DeliveryChallan_status_idx" ON "DeliveryChallan"("status");
      CREATE INDEX IF NOT EXISTS "DeliveryChallan_challanType_idx" ON "DeliveryChallan"("challanType");
      CREATE INDEX IF NOT EXISTS "DeliveryChallan_invoiceId_idx" ON "DeliveryChallan"("invoiceId");
      CREATE INDEX IF NOT EXISTS "DeliveryChallan_customerId_idx" ON "DeliveryChallan"("customerId");
      CREATE INDEX IF NOT EXISTS "DeliveryChallan_supplierId_idx" ON "DeliveryChallan"("supplierId");
      CREATE INDEX IF NOT EXISTS "DeliveryChallan_vendorId_idx" ON "DeliveryChallan"("vendorId");
    `);

    // 4. Create DeliveryChallanItem table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DeliveryChallanItem" (
        "id" TEXT NOT NULL,
        "challanId" TEXT NOT NULL,
        "productId" TEXT,
        "uomId" TEXT,
        "itemCode" TEXT,
        "itemName" TEXT NOT NULL,
        "description" TEXT,
        "hsnCode" TEXT,
        "uom" TEXT,
        "batchNumber" TEXT,
        "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "DeliveryChallanItem_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ DeliveryChallanItem table verified');

    // 5. Create DeliveryChallanItem foreign keys & indexes
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'DeliveryChallanItem_challanId_fkey'
        ) THEN
          ALTER TABLE "DeliveryChallanItem"
          ADD CONSTRAINT "DeliveryChallanItem_challanId_fkey"
          FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'DeliveryChallanItem_productId_fkey'
        ) THEN
          ALTER TABLE "DeliveryChallanItem"
          ADD CONSTRAINT "DeliveryChallanItem_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'DeliveryChallanItem_uomId_fkey'
        ) THEN
          ALTER TABLE "DeliveryChallanItem"
          ADD CONSTRAINT "DeliveryChallanItem_uomId_fkey"
          FOREIGN KEY ("uomId") REFERENCES "Uom"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END$$;

      CREATE INDEX IF NOT EXISTS "DeliveryChallanItem_challanId_idx" ON "DeliveryChallanItem"("challanId");
      CREATE INDEX IF NOT EXISTS "DeliveryChallanItem_productId_idx" ON "DeliveryChallanItem"("productId");
      CREATE INDEX IF NOT EXISTS "DeliveryChallanItem_uomId_idx" ON "DeliveryChallanItem"("uomId");
    `);

    // 6. Foreign keys for DeliveryChallan relations
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'DeliveryChallan_customerId_fkey'
        ) THEN
          ALTER TABLE "DeliveryChallan"
          ADD CONSTRAINT "DeliveryChallan_customerId_fkey"
          FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'DeliveryChallan_supplierId_fkey'
        ) THEN
          ALTER TABLE "DeliveryChallan"
          ADD CONSTRAINT "DeliveryChallan_supplierId_fkey"
          FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'DeliveryChallan_vendorId_fkey'
        ) THEN
          ALTER TABLE "DeliveryChallan"
          ADD CONSTRAINT "DeliveryChallan_vendorId_fkey"
          FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END$$;
    `);

    await client.query('COMMIT');
    console.log('🎉 Delivery Challan database tables and relations created successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating Delivery Challan tables:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
