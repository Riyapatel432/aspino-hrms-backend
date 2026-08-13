const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Inspecting PassCategory table structure and rows in PostgreSQL...');
    const colRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'PassCategory';
    `);
    console.table(colRes.rows);

    const idType = colRes.rows.find(c => c.column_name === 'id')?.data_type;
    if (idType === 'text' || idType === 'character varying') {
      console.log('Re-creating PassCategory table with Int SERIAL primary key...');
      try { await pool.query('ALTER TABLE "GatePass" DROP CONSTRAINT IF EXISTS "GatePass_categoryId_fkey";'); } catch(e) {}
      await pool.query('DROP TABLE IF EXISTS "PassCategory" CASCADE;');
      await pool.query(`
        CREATE TABLE "PassCategory" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "code" TEXT UNIQUE NOT NULL,
          "type" "GatePassType" NOT NULL,
          "description" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Successfully re-created PassCategory table with integer IDs!');
    }
  } catch (err) {
    console.error('PassCategory check error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
