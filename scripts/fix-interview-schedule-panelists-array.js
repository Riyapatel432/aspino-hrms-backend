const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Converting array columns in PostgreSQL to text[]...');

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InterviewSchedule' AND column_name = 'panelists' AND data_type != 'ARRAY') THEN
          ALTER TABLE "InterviewSchedule" ALTER COLUMN "panelists" TYPE text[] USING (
            CASE 
              WHEN "panelists" IS NULL THEN '{}'::text[]
              WHEN "panelists"::text LIKE '[%' THEN string_to_array(replace(replace("panelists"::text, '[', ''), ']', ''), ',')::text[]
              ELSE ARRAY["panelists"::text]::text[]
            END
          );
        END IF;
      END $$;
    `);

    try {
      await pool.query(`
        ALTER TABLE IF EXISTS "Supplier" ALTER COLUMN "approvedCategories" TYPE text[] USING (
          CASE 
            WHEN "approvedCategories" IS NULL THEN '{}'::text[]
            WHEN "approvedCategories"::text LIKE '[%' THEN string_to_array(replace(replace("approvedCategories"::text, '[', ''), ']', ''), ',')::text[]
            ELSE ARRAY["approvedCategories"::text]::text[]
          END
        );
      `);
    } catch(e) {}

    console.log('Successfully converted array columns to text[] in PostgreSQL!');
  } catch (err) {
    console.error('Column conversion error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
