const { Pool } = require('d:/Aspino-Hrms/nestjs-aspino-hrms/node_modules/pg');

async function main() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public' });
  
  console.log('Updating location and phone for existing employees...');
  
  const updates = [
    { employeeId: 'EMP_PROD_002', phone: '+91 98250 12345', location: 'Vadodara Plant' },
    { employeeId: 'EMP_PROD_001', phone: '+91 98250 12346', location: 'Vadodara Plant' },
    { employeeId: 'EMP_IT_001', phone: '+91 98765 11001', location: 'Ahmedabad HQ' },
    { employeeId: 'EMP_IT_002', phone: '+91 98765 11002', location: 'Ahmedabad HQ' },
    { employeeId: 'EMP_IT_003', phone: '+91 98765 11003', location: 'Ahmedabad HQ' },
    { employeeId: 'EMP_HR_001', phone: '+91 98765 22001', location: 'Corporate HQ' },
    { employeeId: 'EMP_HR_002', phone: '+91 98765 22002', location: 'Corporate HQ' },
    { employeeId: 'EMP_FIN_001', phone: '+91 98765 33001', location: 'Corporate HQ' },
    { employeeId: 'EMP_FIN_002', phone: '+91 98765 33002', location: 'Corporate HQ' },
    { employeeId: 'aspino_2026_001', phone: '+91 99887 76651', location: 'Vadodara Plant' },
    { employeeId: 'aspino_2026_002', phone: '+91 99887 76652', location: 'Vadodara Plant' },
    { employeeId: 'aspino_2026_003', phone: '+91 99887 76653', location: 'Vadodara Plant' },
    { employeeId: 'aspino_2026_004', phone: '+91 99887 76654', location: 'Vadodara Plant' },
  ];

  for (const item of updates) {
    await pool.query(
      'UPDATE "Employee" SET phone = $1, location = $2 WHERE "employeeId" = $3 OR (phone IS NULL AND "employeeId" = $3);',
      [item.phone, item.location, item.employeeId]
    );
  }

  // Also ensure any remaining employees with NULL location get default location
  await pool.query('UPDATE "Employee" SET location = \'Vadodara Plant\' WHERE location IS NULL;');

  const res = await pool.query('SELECT id, "employeeId", "firstName", "lastName", phone, location, "qrToken" FROM "Employee";');
  console.table(res.rows);
  
  await pool.end();
}

main().catch(console.error);
