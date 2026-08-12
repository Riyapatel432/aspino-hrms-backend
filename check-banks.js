const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public' });
pool.query('SELECT * FROM "Bank"').then(res => { console.log(res.rows); process.exit(0); }).catch(console.error);
