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
    console.log('--- Creating Invoice tables if not exist ---');
    await client.query('BEGIN');

    // 1. Create Enums if not exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceType') THEN
          CREATE TYPE "InvoiceType" AS ENUM ('SALES', 'PURCHASE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
          CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');
        END IF;
      END$$;
    `);
    console.log('✅ InvoiceType and InvoiceStatus enums verified');

    // 2. Create Invoice table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT NOT NULL,
        "invoiceNumber" TEXT NOT NULL,
        "type" "InvoiceType" NOT NULL DEFAULT 'SALES',
        "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
        "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dueDate" TIMESTAMP(3),
        "referenceNumber" TEXT,
        "documentUrl" TEXT,

        "quotationId" TEXT,
        "purchaseOrderId" TEXT,
        "customerId" TEXT,
        "supplierId" TEXT,
        "vendorId" TEXT,

        "partyName" TEXT NOT NULL,
        "partyEmail" TEXT,
        "partyPhone" TEXT,
        "partyAddress" TEXT,
        "partyGstNo" TEXT,
        "partyPanNo" TEXT,

        "billingAddress" TEXT,
        "shippingAddress" TEXT,
        "placeOfSupply" TEXT,
        "deliveryMode" TEXT,
        "truckNumber" TEXT,
        "transporterName" TEXT,
        "lrNumber" TEXT,
        "driverName" TEXT,
        "driverContact" TEXT,

        "currency" TEXT NOT NULL DEFAULT 'INR',
        "subTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxType" TEXT NOT NULL DEFAULT 'GST',
        "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "shippingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

        "paymentTerms" TEXT,
        "paymentMethod" TEXT,
        "bankName" TEXT,
        "bankAccountNumber" TEXT,
        "bankIfsc" TEXT,
        "termsAndConditions" TEXT,
        "notes" TEXT,

        "preparedBy" TEXT,
        "approvedBy" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
      );
    `);

    // Add columns to existing Invoice table if missing
    await client.query(`
      ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "deliveryMode" TEXT;
      ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "truckNumber" TEXT;
      ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "transporterName" TEXT;
      ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "lrNumber" TEXT;
      ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "driverName" TEXT;
      ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "driverContact" TEXT;
    `);
    console.log('✅ Invoice table and delivery/truck columns verified');

    // 3. Create Invoice indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
      CREATE INDEX IF NOT EXISTS "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
      CREATE INDEX IF NOT EXISTS "Invoice_type_idx" ON "Invoice"("type");
      CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
      CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
      CREATE INDEX IF NOT EXISTS "Invoice_supplierId_idx" ON "Invoice"("supplierId");
      CREATE INDEX IF NOT EXISTS "Invoice_vendorId_idx" ON "Invoice"("vendorId");
      CREATE INDEX IF NOT EXISTS "Invoice_purchaseOrderId_idx" ON "Invoice"("purchaseOrderId");
      CREATE INDEX IF NOT EXISTS "Invoice_quotationId_idx" ON "Invoice"("quotationId");
    `);

    // 4. Create InvoiceItem table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id" TEXT NOT NULL,
        "invoiceId" TEXT NOT NULL,
        "productId" TEXT,
        "uomId" TEXT,
        "itemCode" TEXT,
        "itemName" TEXT NOT NULL,
        "description" TEXT,
        "hsnCode" TEXT,
        "uom" TEXT,
        "batchNumber" TEXT,
        "expiryDate" TIMESTAMP(3),
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

        CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
      );

      ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "uomId" TEXT;
    `);
    console.log('✅ InvoiceItem table verified');

    // 5. Create InvoiceItem indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
      CREATE INDEX IF NOT EXISTS "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");
      CREATE INDEX IF NOT EXISTS "InvoiceItem_uomId_idx" ON "InvoiceItem"("uomId");
    `);

    // 6. Foreign Keys
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_quotationId_fkey'
        ) THEN
          ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_purchaseOrderId_fkey'
        ) THEN
          ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_supplierId_fkey'
        ) THEN
          ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_vendorId_fkey'
        ) THEN
          ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_customerId_fkey'
        ) THEN
          ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InvoiceItem_invoiceId_fkey'
        ) THEN
          ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InvoiceItem_productId_fkey'
        ) THEN
          ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InvoiceItem_uomId_fkey'
        ) THEN
          ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "Uom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END$$;
    `);
    console.log('✅ Foreign keys verified');

    // 7. Ensure RBAC permissions exist for invoice module
    const permissions = [
      { name: 'read-invoice', action: 'read', module: 'invoice', app: 'GLOBAL', desc: 'View invoices and tax invoices' },
      { name: 'create-invoice', action: 'create', module: 'invoice', app: 'GLOBAL', desc: 'Generate and create tax invoices' },
      { name: 'update-invoice', action: 'update', module: 'invoice', app: 'GLOBAL', desc: 'Update and revise invoices' },
      { name: 'delete-invoice', action: 'delete', module: 'invoice', app: 'GLOBAL', desc: 'Delete invoices' },
      { name: 'approve-invoice', action: 'approve', module: 'invoice', app: 'GLOBAL', desc: 'Approve or mark invoices paid' },
      { name: 'export-invoice', action: 'export', module: 'invoice', app: 'GLOBAL', desc: 'Export and download invoice PDFs' },
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
    console.log('✅ RBAC permissions for invoice registered');

    // Grant all invoice permissions to SUPER_ADMIN, ADMIN, MANAGER
    const adminRoles = await client.query(`SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')`);
    const permRows = await client.query(`SELECT id FROM permissions WHERE module = 'invoice'`);

    for (const r of adminRoles.rows) {
      for (const p of permRows.rows) {
        await client.query(`
          INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
          VALUES (gen_random_uuid(), $1, $2, NOW())
          ON CONFLICT ("roleId", "permissionId") DO NOTHING
        `, [r.id, p.id]);
      }
    }
    console.log('✅ Admin roles linked with invoice permissions');

    await client.query('COMMIT');
    console.log('🎉 Invoice tables and RBAC setup completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during invoice tables creation:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
