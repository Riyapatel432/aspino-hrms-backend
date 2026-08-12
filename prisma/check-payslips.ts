import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const structs = await prisma.salaryStructure.findMany({
    include: { employee: true }
  });
  console.log('=== SALARY STRUCTURES ===');
  console.log(JSON.stringify(structs, null, 2));

  const payslips = await prisma.payslip.findMany({
    include: { employee: true }
  });
  console.log('=== PAYSLIPS ===');
  console.log(JSON.stringify(payslips, null, 2));
}

main().finally(() => prisma.$disconnect());
