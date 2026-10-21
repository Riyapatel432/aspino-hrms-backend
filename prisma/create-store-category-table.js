const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
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
  console.log('StoreCategory table verified/created successfully');

  // Seed default Store Categories if empty
  const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "StoreCategory"`);
  if (count[0]?.cnt === 0) {
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
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StoreCategory" ("id", "categoryCode", "categoryName", "description", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, true, NOW(), NOW()) ON CONFLICT ("categoryCode") DO NOTHING`,
        id, d.code, d.name, d.desc
      );
    }
    console.log('Seeded default store categories');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
