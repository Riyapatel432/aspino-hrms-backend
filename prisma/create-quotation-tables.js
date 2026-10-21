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
    console.log('--- Creating Quotation tables if not exist ---');
    await client.query('BEGIN');

    // 1. Create QuotationStatus Enum if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuotationStatus') THEN
          CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');
        END IF;
      END$$;
    `);
    console.log('✅ QuotationStatus enum checked/created');

    // 2. Create Quotation table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Quotation" (
        "id" TEXT NOT NULL,
        "quotationNumber" TEXT NOT NULL,
        "customerId" TEXT,
        "customerName" TEXT NOT NULL,
        "customerEmail" TEXT,
        "customerPhone" TEXT,
        "billingAddress" TEXT,
        "shippingAddress" TEXT,
        "gstNo" TEXT,
        "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "validUntil" TIMESTAMP(3),
        "referenceNumber" TEXT,
        "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
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

        CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Quotation table checked/created');

    // 3. Create unique index on quotationNumber
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");
      CREATE INDEX IF NOT EXISTS "Quotation_customerId_idx" ON "Quotation"("customerId");
      CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status");
      CREATE INDEX IF NOT EXISTS "Quotation_quotationNumber_idx" ON "Quotation"("quotationNumber");
    `);

    // 4. Create QuotationItem table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QuotationItem" (
        "id" TEXT NOT NULL,
        "quotationId" TEXT NOT NULL,
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

        CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ QuotationItem table checked/created');

    // 5. Create QuotationItem foreign keys & indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
      CREATE INDEX IF NOT EXISTS "QuotationItem_productId_idx" ON "QuotationItem"("productId");

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Quotation_customerId_fkey'
        ) THEN
          ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'QuotationItem_quotationId_fkey'
        ) THEN
          ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'QuotationItem_productId_fkey'
        ) THEN
          ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END$$;
    `);

    // 6. Ensure RBAC permissions exist for Quotation module
    const permissions = [
      { name: 'read-quotation', action: 'read', module: 'quotation', app: 'GLOBAL', desc: 'View quotations and estimates' },
      { name: 'create-quotation', action: 'create', module: 'quotation', app: 'GLOBAL', desc: 'Create new quotations' },
      { name: 'update-quotation', action: 'update', module: 'quotation', app: 'GLOBAL', desc: 'Update and revise quotations' },
      { name: 'delete-quotation', action: 'delete', module: 'quotation', app: 'GLOBAL', desc: 'Delete quotations' },
      { name: 'approve-quotation', action: 'approve', module: 'quotation', app: 'GLOBAL', desc: 'Approve quotation pricing' },
      { name: 'export-quotation', action: 'export', module: 'quotation', app: 'GLOBAL', desc: 'Export and print quotations' },
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
    console.log('✅ RBAC permissions for quotation module registered');

    // Grant all quotation permissions to SUPER_ADMIN and ADMIN roles
    const adminRoles = await client.query(`SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')`);
    const permRows = await client.query(`SELECT id FROM permissions WHERE module = 'quotation'`);

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
    console.log('🎉 Quotation tables and permissions initialized successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating quotation tables:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
