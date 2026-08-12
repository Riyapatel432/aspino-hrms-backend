import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PayrollService } from '../src/modules/payroll/services/payroll.service';
import { PayrollRepository } from '../src/modules/payroll/repositories/payroll.repository';
import { PrismaService } from '../src/database/prisma/prisma.service';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const prismaService = prisma as any;
const repo = new PayrollRepository(prismaService);
const service = new PayrollService(repo, prismaService);

async function main() {
  console.log('--- RE-RUNNING PAYROLL FOR MONTH 8, 2026 ---');
  const run = await service.runMonthlyPayroll(8, 2026);
  console.log('Resulting Payroll Run & Payslips:');
  console.log(JSON.stringify(run, null, 2));
}

main().finally(() => prisma.$disconnect());
