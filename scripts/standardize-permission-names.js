const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

async function standardizePermissions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Fetch all permissions
    const res = await client.query('SELECT id, name, module, action, application FROM permissions');
    console.log(`Found ${res.rows.length} permissions.`);

    let updatedCount = 0;
    for (const row of res.rows) {
      const act = (row.action || 'read').trim().toLowerCase();
      const mod = (row.module || 'general').trim().toLowerCase();
      
      // Standardize name to action-module (e.g. create-user, update-attendance, delete-product)
      const standardName = `${act}-${mod}`;
      
      if (row.name !== standardName) {
        await client.query(
          'UPDATE permissions SET name = $1 WHERE id = $2',
          [standardName, row.id]
        );
        console.log(`Updated ID ${row.id}: "${row.name}" -> "${standardName}"`);
        updatedCount++;
      }
    }

    console.log(`\n Successfully standardized ${updatedCount} permission names to "action-module" format!`);
    
    // Show sample of current permissions in database
    const sampleRes = await client.query('SELECT name, module, action FROM permissions ORDER BY module, action LIMIT 25');
    console.log('\nSample standardized permissions:');
    sampleRes.rows.forEach(r => console.log(` - ${r.name} (${r.module} -> ${r.action})`));

    client.release();
  } catch (err) {
    console.error('Error standardizing permissions:', err);
  } finally {
    await pool.end();
  }
}

standardizePermissions();
