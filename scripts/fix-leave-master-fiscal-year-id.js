const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Resolving FY27 in FiscalYear table...');
    // Ensure FY27 exists in FiscalYear
    let res = await pool.query('SELECT id FROM "FiscalYear" WHERE name = $1 LIMIT 1', ['FY27']);
    let fyId;
    if (res.rows.length > 0) {
      fyId = res.rows[0].id;
    } else {
      const crypto = require('crypto');
      fyId = crypto.randomUUID();
      await pool.query('INSERT INTO "FiscalYear" (id, name, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, true, NOW(), NOW())', [fyId, 'FY27']);
    }
    console.log(`Found/Created FY27 with UUID: ${fyId}`);

    // Update all DepartmentLeaveMaster rows where fiscalYearId is 'FY27'
    const updateRes = await pool.query('UPDATE "DepartmentLeaveMaster" SET "fiscalYearId" = $1 WHERE "fiscalYearId" = $2 OR "fiscalYearId" IS NULL', [fyId, 'FY27']);
    console.log(`Updated ${updateRes.rowCount} rows in DepartmentLeaveMaster to store FiscalYear UUID!`);
  } catch (err) {
    console.error('Fix error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
