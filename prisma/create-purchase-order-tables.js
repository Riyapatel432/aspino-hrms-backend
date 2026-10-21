const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Creating Purchase Order tables & permissions ---');
    await client.query('BEGIN');

    // 1. Create Enums if not exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseOrderType') THEN
          CREATE TYPE "PurchaseOrderType" AS ENUM ('PROCUREMENT', 'SALES');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseOrderStatus') THEN
          CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'CONFIRMED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED');
        END IF;
      END$$;
    `);
    console.log('✅ PurchaseOrderType and PurchaseOrderStatus enums verified');

    // 2. Add Customer PO fields to Quotation table if not exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Quotation' AND column_name = 'customerPoNumber'
        ) THEN
          ALTER TABLE "Quotation" ADD COLUMN "customerPoNumber" TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Quotation' AND column_name = 'customerPoDate'
        ) THEN
          ALTER TABLE "Quotation" ADD COLUMN "customerPoDate" TIMESTAMP(3);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Quotation' AND column_name = 'customerPoNotes'
        ) THEN
          ALTER TABLE "Quotation" ADD COLUMN "customerPoNotes" TEXT;
        END IF;
      END$$;
    `);
    console.log('✅ Quotation table Customer PO columns verified');

    // 3. Create PurchaseOrder table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
        "id" TEXT NOT NULL,
        "poNumber" TEXT NOT NULL,
        "type" "PurchaseOrderType" NOT NULL DEFAULT 'PROCUREMENT',
        "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
        "poDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expectedDeliveryDate" TIMESTAMP(3),
        "referenceNumber" TEXT,

        "quotationId" TEXT,
        "supplierId" TEXT,
        "vendorId" TEXT,
        "customerId" TEXT,

        "partyName" TEXT NOT NULL,
        "partyEmail" TEXT,
        "partyPhone" TEXT,
        "partyAddress" TEXT,
        "partyGstNo" TEXT,

        "billingAddress" TEXT,
        "shippingAddress" TEXT,

        "currency" TEXT NOT NULL DEFAULT 'INR',
        "subTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxType" TEXT NOT NULL DEFAULT 'GST',
        "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "shippingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

        "paymentTerms" TEXT,
        "deliveryTerms" TEXT,
        "termsAndConditions" TEXT,
        "notes" TEXT,

        "preparedBy" TEXT,
        "approvedBy" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
      );
    `);

    // Ensure documentUrl exists if table was previously created
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'PurchaseOrder' AND column_name = 'documentUrl'
        ) THEN
          ALTER TABLE "PurchaseOrder" ADD COLUMN "documentUrl" TEXT;
        END IF;
      END$$;
    `);
    console.log('✅ PurchaseOrder table and documentUrl column verified');

    // 4. Create PurchaseOrder indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");
      CREATE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");
      CREATE INDEX IF NOT EXISTS "PurchaseOrder_type_idx" ON "PurchaseOrder"("type");
      CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");
      CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
      CREATE INDEX IF NOT EXISTS "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");
      CREATE INDEX IF NOT EXISTS "PurchaseOrder_customerId_idx" ON "PurchaseOrder"("customerId");
      CREATE INDEX IF NOT EXISTS "PurchaseOrder_quotationId_idx" ON "PurchaseOrder"("quotationId");
    `);

    // 5. Create PurchaseOrderItem table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
        "id" TEXT NOT NULL,
        "purchaseOrderId" TEXT NOT NULL,
        "productId" TEXT,
        "itemCode" TEXT,
        "itemName" TEXT NOT NULL,
        "description" TEXT,
        "hsnCode" TEXT,
        "uom" TEXT,
        "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ PurchaseOrderItem table verified');

    // 6. Indexes & Foreign Keys
    await client.query(`
      CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
      CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PurchaseOrder_quotationId_fkey'
        ) THEN
          ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PurchaseOrder_supplierId_fkey'
        ) THEN
          ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PurchaseOrder_vendorId_fkey'
        ) THEN
          ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PurchaseOrder_customerId_fkey'
        ) THEN
          ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PurchaseOrderItem_purchaseOrderId_fkey'
        ) THEN
          ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PurchaseOrderItem_productId_fkey'
        ) THEN
          ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END$$;
    `);
    console.log('✅ Foreign keys verified');

    // 7. Ensure RBAC permissions exist for purchase_order module
    const permissions = [
      { name: 'read-purchase_order', action: 'read', module: 'purchase_order', app: 'GLOBAL', desc: 'View purchase orders and order slips' },
      { name: 'create-purchase_order', action: 'create', module: 'purchase_order', app: 'GLOBAL', desc: 'Generate purchase orders' },
      { name: 'update-purchase_order', action: 'update', module: 'purchase_order', app: 'GLOBAL', desc: 'Update and revise purchase orders' },
      { name: 'delete-purchase_order', action: 'delete', module: 'purchase_order', app: 'GLOBAL', desc: 'Delete purchase orders' },
      { name: 'approve-purchase_order', action: 'approve', module: 'purchase_order', app: 'GLOBAL', desc: 'Approve purchase orders' },
      { name: 'export-purchase_order', action: 'export', module: 'purchase_order', app: 'GLOBAL', desc: 'Export and download purchase order PDFs' },
    ];

    for (const p of permissions) {
      await client.query(`
        INSERT INTO permissions (id, name, action, module, application, description, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (application, module, action) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          "updatedAt" = NOW()
      `, [p.name, p.action, p.module, p.app, p.desc]);
    }
    console.log('✅ RBAC permissions for purchase_order registered');

    // Grant all purchase_order permissions to SUPER_ADMIN, ADMIN, MANAGER
    const adminRoles = await client.query(`SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')`);
    const permRows = await client.query(`SELECT id FROM permissions WHERE module = 'purchase_order'`);

    for (const r of adminRoles.rows) {
      for (const p of permRows.rows) {
        await client.query(`
          INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
          VALUES (gen_random_uuid(), $1, $2, NOW())
          ON CONFLICT ("roleId", "permissionId") DO NOTHING
        `, [r.id, p.id]);
      }
    }
    console.log('✅ Role permissions mapped for admin roles');

    await client.query('COMMIT');
    console.log('🎉 Purchase Order tables and permissions initialized successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating purchase order tables:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
