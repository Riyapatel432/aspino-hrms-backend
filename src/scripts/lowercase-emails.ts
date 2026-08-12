import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Sanitizing existing emails to lowercase in database ---');

  // 1. Update Candidate emails
  const candidates = await prisma.candidate.findMany();
  let candCount = 0;
  for (const cand of candidates) {
    if (cand.email && cand.email !== cand.email.toLowerCase().trim()) {
      await prisma.candidate.update({
        where: { id: cand.id },
        data: { email: cand.email.toLowerCase().trim() },
      });
      candCount++;
      console.log(`Updated candidate email: ${cand.email} -> ${cand.email.toLowerCase().trim()}`);
    }
  }

  // 2. Update Employee emails
  const employees = await prisma.employee.findMany();
  let empCount = 0;
  for (const emp of employees) {
    if (emp.email && emp.email !== emp.email.toLowerCase().trim()) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { email: emp.email.toLowerCase().trim() },
      });
      empCount++;
      console.log(`Updated employee email: ${emp.email} -> ${emp.email.toLowerCase().trim()}`);
    }
  }

  // 3. Update User emails
  const users = await prisma.user.findMany();
  let userCount = 0;
  for (const u of users) {
    if (u.email && u.email !== u.email.toLowerCase().trim()) {
      await prisma.user.update({
        where: { id: u.id },
        data: { email: u.email.toLowerCase().trim() },
      });
      userCount++;
      console.log(`Updated user email: ${u.email} -> ${u.email.toLowerCase().trim()}`);
    }
  }

  console.log(`--- Email lowercase sanitization completed! Updated ${candCount} candidates, ${empCount} employees, ${userCount} users. ---`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
