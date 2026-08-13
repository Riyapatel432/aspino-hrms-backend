const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT column_name, is_nullable, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Employee'
      ORDER BY ordinal_position;
    `);
    console.log('Employee table columns:');
    console.table(res.rows);

    // Drop NOT NULL on all optional/legacy columns of Employee table
    for (const col of res.rows) {
      if (col.is_nullable === 'NO' && !['id', 'employeeId', 'firstName', 'lastName', 'email', 'departmentId', 'designation', 'dateOfJoining'].includes(col.column_name)) {
        console.log(`Dropping NOT NULL on Employee.${col.column_name}`);
        await pool.query(`ALTER TABLE "Employee" ALTER COLUMN "${col.column_name}" DROP NOT NULL;`);
      }
    }
    console.log('Done checking and dropping NOT NULL constraints on Employee table.');
  } catch (err) {
    console.error('Inspect error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
