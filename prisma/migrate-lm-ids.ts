import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const depts = await prisma.department.findMany();
  const fys = await prisma.fiscalYear.findMany();
  const lms = await prisma.departmentLeaveMaster.findMany();

  console.log(`Found ${lms.length} DepartmentLeaveMaster records.`);

  for (const lm of lms) {
    const deptMatch = depts.find(d => d.id === lm.department || d.name.toLowerCase() === lm.department.toLowerCase());
    const fyMatch = fys.find(f => f.id === lm.fiscalYear || f.name.toLowerCase() === lm.fiscalYear.toLowerCase());

    const updateData: any = {};
    if (deptMatch) {
      updateData.department = deptMatch.id;
    }
    if (fyMatch) {
      updateData.fiscalYear = fyMatch.id;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.departmentLeaveMaster.update({
        where: { id: lm.id },
        data: updateData,
      });
      console.log(`Updated Leave Master ${lm.id}:`, updateData);
    }
  }

  console.log('✅ Migrated all Leave Master records to store IDs!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
