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
    console.log('--- Creating Credit & Debit Note tables ---');
    await client.query('BEGIN');

    // 1. Create Enums if not exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NoteType') THEN
          CREATE TYPE "NoteType" AS ENUM ('CREDIT_NOTE', 'DEBIT_NOTE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NoteStatus') THEN
          CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED');
        END IF;
      END$$;
    `);
    console.log('✅ NoteType and NoteStatus enums verified');

    // 2. Create CreditDebitNote table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CreditDebitNote" (
        "id" TEXT NOT NULL,
        "noteNumber" TEXT NOT NULL,
        "type" "NoteType" NOT NULL DEFAULT 'CREDIT_NOTE',
        "status" "NoteStatus" NOT NULL DEFAULT 'DRAFT',
        "noteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reason" TEXT NOT NULL,

        "invoiceId" TEXT,
        "invoiceNumber" TEXT,
        "originalInvoiceDate" TIMESTAMP(3),

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

        "currency" TEXT NOT NULL DEFAULT 'INR',
        "subTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxType" TEXT NOT NULL DEFAULT 'GST',
        "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "adjustedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

        "termsAndConditions" TEXT,
        "notes" TEXT,
        "documentUrl" TEXT,

        "preparedBy" TEXT,
        "approvedBy" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "CreditDebitNote_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ CreditDebitNote table verified');

    // 3. Create CreditDebitNote indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "CreditDebitNote_noteNumber_key" ON "CreditDebitNote"("noteNumber");
      CREATE INDEX IF NOT EXISTS "CreditDebitNote_noteNumber_idx" ON "CreditDebitNote"("noteNumber");
      CREATE INDEX IF NOT EXISTS "CreditDebitNote_type_idx" ON "CreditDebitNote"("type");
      CREATE INDEX IF NOT EXISTS "CreditDebitNote_status_idx" ON "CreditDebitNote"("status");
      CREATE INDEX IF NOT EXISTS "CreditDebitNote_invoiceId_idx" ON "CreditDebitNote"("invoiceId");
      CREATE INDEX IF NOT EXISTS "CreditDebitNote_customerId_idx" ON "CreditDebitNote"("customerId");
      CREATE INDEX IF NOT EXISTS "CreditDebitNote_supplierId_idx" ON "CreditDebitNote"("supplierId");
      CREATE INDEX IF NOT EXISTS "CreditDebitNote_vendorId_idx" ON "CreditDebitNote"("vendorId");
    `);

    // 4. Create CreditDebitNoteItem table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CreditDebitNoteItem" (
        "id" TEXT NOT NULL,
        "noteId" TEXT NOT NULL,
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

        CONSTRAINT "CreditDebitNoteItem_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ CreditDebitNoteItem table verified');

    // 5. Create CreditDebitNoteItem indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS "CreditDebitNoteItem_noteId_idx" ON "CreditDebitNoteItem"("noteId");
      CREATE INDEX IF NOT EXISTS "CreditDebitNoteItem_productId_idx" ON "CreditDebitNoteItem"("productId");
      CREATE INDEX IF NOT EXISTS "CreditDebitNoteItem_uomId_idx" ON "CreditDebitNoteItem"("uomId");
    `);

    // 6. Foreign Keys
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreditDebitNote_invoiceId_fkey'
        ) THEN
          ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreditDebitNote_customerId_fkey'
        ) THEN
          ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreditDebitNote_supplierId_fkey'
        ) THEN
          ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreditDebitNote_vendorId_fkey'
        ) THEN
          ALTER TABLE "CreditDebitNote" ADD CONSTRAINT "CreditDebitNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreditDebitNoteItem_noteId_fkey'
        ) THEN
          ALTER TABLE "CreditDebitNoteItem" ADD CONSTRAINT "CreditDebitNoteItem_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "CreditDebitNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END$$;
    `);
    console.log('✅ Foreign keys verified');

    // 7. Register RBAC permissions for Credit/Debit Note
    const permissions = [
      { name: 'read-credit-debit-note', action: 'read', module: 'credit_debit_note', app: 'GLOBAL', desc: 'Read credit and debit notes' },
      { name: 'create-credit-debit-note', action: 'create', module: 'credit_debit_note', app: 'GLOBAL', desc: 'Create credit and debit notes' },
      { name: 'update-credit-debit-note', action: 'update', module: 'credit_debit_note', app: 'GLOBAL', desc: 'Update credit and debit notes' },
      { name: 'delete-credit-debit-note', action: 'delete', module: 'credit_debit_note', app: 'GLOBAL', desc: 'Delete credit and debit notes' },
      { name: 'approve-credit-debit-note', action: 'approve', module: 'credit_debit_note', app: 'GLOBAL', desc: 'Approve or apply credit and debit notes' },
      { name: 'export-credit-debit-note', action: 'export', module: 'credit_debit_note', app: 'GLOBAL', desc: 'Export credit and debit note PDFs' },
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
    console.log('✅ RBAC permissions for credit_debit_note registered');

    // Grant all credit_debit_note permissions to SUPER_ADMIN, ADMIN, MANAGER
    const adminRoles = await client.query(`SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')`);
    const permRows = await client.query(`SELECT id FROM permissions WHERE module = 'credit_debit_note'`);

    for (const r of adminRoles.rows) {
      for (const p of permRows.rows) {
        await client.query(`
          INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
          VALUES (gen_random_uuid(), $1, $2, NOW())
          ON CONFLICT ("roleId", "permissionId") DO NOTHING
        `, [r.id, p.id]);
      }
    }
    console.log('✅ Admin roles linked with credit_debit_note permissions');

    await client.query('COMMIT');
    console.log('🎉 Credit & Debit Note database setup completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database setup:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
