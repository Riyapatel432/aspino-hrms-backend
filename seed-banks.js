const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public' });
const now = new Date().toISOString();
const q = `INSERT INTO "Bank" (name, "updatedAt") VALUES ('HDFC Bank', $1), ('State Bank of India', $1), ('ICICI Bank', $1), ('Axis Bank', $1) ON CONFLICT (name) DO NOTHING;`;
pool.query(q, [now])
  .then(res => { console.log('Banks seeded'); process.exit(0); })
  .catch(console.error);
