const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Creating StoreCategory table if not exists ---');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "StoreCategory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "categoryCode" TEXT NOT NULL UNIQUE,
        "categoryName" TEXT NOT NULL,
        "description" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "StoreCategory_categoryCode_idx" ON "StoreCategory"("categoryCode");
    `);

    // Check count and seed defaults
    const countRes = await client.query(`SELECT COUNT(*)::int as cnt FROM "StoreCategory"`);
    if (countRes.rows[0]?.cnt === 0) {
      console.log('Seeding default store categories...');
      const defaults = [
        { code: 'SPARE_PARTS', name: 'Spare Parts', desc: 'Mechanical, electrical & machine components' },
        { code: 'TOOLS', name: 'Tools & Equipment', desc: 'Hand tools, calibration instruments & power tools' },
        { code: 'ELECTRICAL', name: 'Electrical & Automation', desc: 'VFDs, PLCs, sensors, cables & contactors' },
        { code: 'MECHANICAL', name: 'Mechanical & Bearings', desc: 'Bearings, gears, shafts, seals & couplings' },
        { code: 'PNEUMATICS', name: 'Pneumatics & Hydraulics', desc: 'Cylinders, valves, air tubes & fittings' },
        { code: 'INSTRUMENTATION', name: 'Instrumentation', desc: 'Pressure gauges, RTDs, thermocouples' },
        { code: 'CONSUMABLES', name: 'Store Consumables', desc: 'Lubricants, greases, fasteners & hardware' },
        { code: 'SAFETY_PPE', name: 'Safety & PPE', desc: 'Safety shoes, gloves, goggles & helmets' },
        { code: 'OTHER', name: 'General Store Spares', desc: 'Other engineering & utility supplies' },
      ];

      for (const d of defaults) {
        const id = require('crypto').randomUUID();
        await client.query(
          `INSERT INTO "StoreCategory" ("id", "categoryCode", "categoryName", "description", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, true, NOW(), NOW()) ON CONFLICT ("categoryCode") DO NOTHING`,
          [id, d.code, d.name, d.desc]
        );
      }
      console.log('Seeded 9 default store categories successfully!');
    }

    await client.query('COMMIT');
    console.log('StoreCategory table ready!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create StoreCategory table:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
