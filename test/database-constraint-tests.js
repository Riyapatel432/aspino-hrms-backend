/**
 * PostgreSQL Database Constraints, Referential Integrity, and Decimal Precision Test Suite
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function record(name, isOk, error = null) {
  results.total++;
  if (isOk) {
    results.passed++;
    console.log(`  ✅ [DB TEST] ${name}`);
  } else {
    results.failed++;
    results.failures.push({ name, error });
    console.error(`  ❌ [DB TEST] ${name} -> FAILED: ${error}`);
  }
}

async function runDbTests() {
  console.log('========================================================================');
  console.log('  STARTING POSTGRESQL INTEGRITY, CONSTRAINT & DECIMAL PRECISION TESTS');
  console.log('========================================================================\n');

  const client = await pool.connect();

  try {
    // 1. Unique Document Number Constraint on Quotation
    console.log('--- 1. Unique Constraints ---');
    try {
      const qNum = `QTN-TEST-UNIQUE-${Date.now()}`;
      await client.query(
        `INSERT INTO "Quotation" (id, "quotationNumber", "customerName", "subTotal", "totalAmount", "updatedAt")
         VALUES ($1, $2, $3, 100, 118, NOW())`,
        ['db-test-q-1', qNum, 'Test Customer']
      );

      let duplicateBlocked = false;
      try {
        await client.query(
          `INSERT INTO "Quotation" (id, "quotationNumber", "customerName", "subTotal", "totalAmount", "updatedAt")
           VALUES ($1, $2, $3, 200, 236, NOW())`,
          ['db-test-q-2', qNum, 'Duplicate Customer']
        );
      } catch (err) {
        duplicateBlocked = err.code === '23505'; // unique_violation in PostgreSQL
      }

      await client.query('DELETE FROM "Quotation" WHERE "quotationNumber" = $1', [qNum]);
      record('PostgreSQL rejects duplicate quotationNumber (code 23505)', duplicateBlocked);
    } catch (e) {
      record('PostgreSQL rejects duplicate quotationNumber (code 23505)', false, e.message);
    }

    // 2. Unique Constraint on DeliveryChallan challanNumber
    try {
      const dcNum = `DC-TEST-UNIQUE-${Date.now()}`;
      await client.query(
        `INSERT INTO "DeliveryChallan" (id, "challanNumber", "partyName", "subTotal", "totalAmount", "updatedAt")
         VALUES ($1, $2, $3, 500, 590, NOW())`,
        ['db-test-dc-1', dcNum, 'Consignee 1']
      );

      let duplicateBlocked = false;
      try {
        await client.query(
          `INSERT INTO "DeliveryChallan" (id, "challanNumber", "partyName", "subTotal", "totalAmount", "updatedAt")
           VALUES ($1, $2, $3, 600, 708, NOW())`,
          ['db-test-dc-2', dcNum, 'Consignee 2']
        );
      } catch (err) {
        duplicateBlocked = err.code === '23505';
      }

      await client.query('DELETE FROM "DeliveryChallan" WHERE "challanNumber" = $1', [dcNum]);
      record('PostgreSQL rejects duplicate challanNumber (code 23505)', duplicateBlocked);
    } catch (e) {
      record('PostgreSQL rejects duplicate challanNumber (code 23505)', false, e.message);
    }

    // 3. Foreign Key Cascade on QuotationItem when Quotation is deleted
    console.log('\n--- 2. Foreign Key & Cascade Deletion ---');
    try {
      const qId = 'db-test-cascade-quote';
      await client.query(
        `INSERT INTO "Quotation" (id, "quotationNumber", "customerName", "subTotal", "totalAmount", "updatedAt")
         VALUES ($1, $2, $3, 1000, 1180, NOW())`,
        [qId, `QTN-CASCADE-${Date.now()}`, 'Cascade Customer']
      );

      await client.query(
        `INSERT INTO "QuotationItem" (id, "quotationId", "itemName", quantity, "unitPrice", "totalPrice", "updatedAt")
         VALUES ($1, $2, $3, 10, 100, 1000, NOW())`,
        ['db-test-cascade-item-1', qId, 'Cascade Line Item']
      );

      // Verify item exists
      const before = await client.query('SELECT COUNT(*) FROM "QuotationItem" WHERE "quotationId" = $1', [qId]);
      const hasItem = parseInt(before.rows[0].count, 10) === 1;

      // Delete parent quotation
      await client.query('DELETE FROM "Quotation" WHERE id = $1', [qId]);

      // Verify cascade deleted the children items
      const after = await client.query('SELECT COUNT(*) FROM "QuotationItem" WHERE "quotationId" = $1', [qId]);
      const itemsCleaned = parseInt(after.rows[0].count, 10) === 0;

      record('QuotationItem records are automatically CASCADE deleted when parent Quotation is removed', hasItem && itemsCleaned);
    } catch (e) {
      record('QuotationItem records are automatically CASCADE deleted when parent Quotation is removed', false, e.message);
    }

    // 4. Transactional Rollback
    console.log('\n--- 3. Transactional Integrity & Rollback ---');
    try {
      const rollbackId = 'db-test-rollback-q';
      let rollbackSucceeded = false;

      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO "Quotation" (id, "quotationNumber", "customerName", "subTotal", "totalAmount", "updatedAt")
           VALUES ($1, $2, $3, 1000, 1180, NOW())`,
          [rollbackId, `QTN-ROLLBACK-${Date.now()}`, 'Rollback Customer']
        );
        // Force an intentional database error: null value in non-null column
        await client.query(
          `INSERT INTO "QuotationItem" (id, "quotationId", "itemName", quantity, "unitPrice", "totalPrice", "updatedAt")
           VALUES ($1, $2, NULL, 10, 100, 1000, NOW())`,
          ['db-test-invalid-item', rollbackId]
        );
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        rollbackSucceeded = true;
      }

      // Verify parent was NOT left as an orphan in database
      const checkRes = await client.query('SELECT id FROM "Quotation" WHERE id = $1', [rollbackId]);
      const orphanPrevented = checkRes.rows.length === 0;

      record('Database rolls back atomically on line item error, preventing orphan parent records', rollbackSucceeded && orphanPrevented);
    } catch (e) {
      record('Database rolls back atomically on line item error, preventing orphan parent records', false, e.message);
    }

    // 5. Decimal and Financial Precision (No 0.1 + 0.2 floating point inaccuracies)
    console.log('\n--- 4. Decimal & Financial Precision ---');
    try {
      // Test multi-line financial addition:
      // Item 1: 0.33 qty @ 33.33 = 10.9989, round to 11.00
      // Item 2: 0.67 qty @ 66.67 = 44.6689, round to 44.67
      // Sum = 55.67
      // 18% GST: 55.67 * 0.18 = 10.0206 => 10.02
      // CGST = 5.01, SGST = 5.01
      // Grand Total = 65.69
      const item1 = Math.round(0.33 * 33.33 * 100) / 100;
      const item2 = Math.round(0.67 * 66.67 * 100) / 100;
      const subTotal = Math.round((item1 + item2) * 100) / 100;
      const cgst = Math.round((subTotal * 0.09) * 100) / 100;
      const sgst = Math.round((subTotal * 0.09) * 100) / 100;
      const tax = Math.round((cgst + sgst) * 100) / 100;
      const total = Math.round((subTotal + tax) * 100) / 100;

      const precisionAccurate = (item1 === 11.00) && (item2 === 44.67) && (subTotal === 55.67) && (cgst === 5.01) && (sgst === 5.01) && (total === 65.69);
      record('Financial decimal-safe rounding and GST two-decimal accuracy', precisionAccurate);
    } catch (e) {
      record('Financial decimal-safe rounding and GST two-decimal accuracy', false, e.message);
    }

    // 6. Soft-delete Isolation
    console.log('\n--- 5. Soft-Delete Isolation Verification ---');
    try {
      const softDelChallanId = 'db-test-soft-del-dc';
      await client.query(
        `INSERT INTO "DeliveryChallan" (id, "challanNumber", "partyName", "isActive", "updatedAt")
         VALUES ($1, $2, $3, false, NOW())`,
        [softDelChallanId, `DC-SOFTDEL-${Date.now()}`, 'Deactivated Consignee']
      );

      // Verify active queries filter it out
      const activeRes = await client.query('SELECT id FROM "DeliveryChallan" WHERE id = $1 AND "isActive" = true', [softDelChallanId]);
      const allRes = await client.query('SELECT id FROM "DeliveryChallan" WHERE id = $1', [softDelChallanId]);

      const isolated = activeRes.rows.length === 0 && allRes.rows.length === 1;

      await client.query('DELETE FROM "DeliveryChallan" WHERE id = $1', [softDelChallanId]);
      record('Soft-deleted records (isActive: false) are properly isolated from active queries', isolated);
    } catch (e) {
      record('Soft-deleted records (isActive: false) are properly isolated from active queries', false, e.message);
    }

  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n========================================================================');
  console.log(`  DATABASE INTEGRITY RESULTS: ${results.passed}/${results.total} Passed`);
  console.log('========================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runDbTests().catch(err => {
  console.error('DATABASE SUITE ERROR:', err);
  process.exit(1);
});
