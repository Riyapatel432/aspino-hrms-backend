const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Inspecting Bank table structure and rows in PostgreSQL...');
    const colRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Bank';
    `);
    console.table(colRes.rows);

    const rowsRes = await pool.query('SELECT * FROM "Bank";');
    console.log('Current Bank rows:');
    console.table(rowsRes.rows);

    // If Bank.id is text or has UUID rows, recreate Bank table matching Prisma model (Int SERIAL PKEY)
    const idType = colRes.rows.find(c => c.column_name === 'id')?.data_type;
    if (idType === 'text' || idType === 'character varying' || rowsRes.rows.some(r => typeof r.id === 'string' && isNaN(Number(r.id)))) {
      console.log('Re-creating Bank table with Int SERIAL primary key...');
      // Remove foreign key dependencies on Bank temporary
      try { await pool.query('ALTER TABLE "Supplier" DROP CONSTRAINT IF EXISTS "Supplier_bankId_fkey";'); } catch(e) {}
      try { await pool.query('ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_bankId_fkey";'); } catch(e) {}
      
      await pool.query('DROP TABLE IF EXISTS "Bank" CASCADE;');
      await pool.query(`
        CREATE TABLE "Bank" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT UNIQUE NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed default banks
      const defaultBanks = [
        'State Bank of India (SBI)',
        'HDFC Bank',
        'ICICI Bank',
        'Axis Bank',
        'Punjab National Bank (PNB)',
        'Bank of Baroda',
        'Kotak Mahindra Bank',
        'Canara Bank',
      ];
      for (const name of defaultBanks) {
        await pool.query('INSERT INTO "Bank" (name, "isActive") VALUES ($1, true) ON CONFLICT (name) DO NOTHING;', [name]);
      }
      console.log('Successfully re-created Bank table with integer IDs and default seed data!');
    }
  } catch (err) {
    console.error('Bank table fix error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
