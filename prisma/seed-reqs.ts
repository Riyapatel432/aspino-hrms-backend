import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const depts = await prisma.department.findMany();
  if (depts.length === 0) return;

  const hr = depts.find(d => d.name === 'HR') || depts[0];
  const qa = depts.find(d => d.name === 'QA') || depts[1] || depts[0];
  const it = depts.find(d => d.name.includes('IT') || d.name.includes('Information')) || depts[2] || depts[0];

  await prisma.jobRequisition.createMany({
    data: [
      { title: 'Senior HR Specialist', departmentId: hr.id, headcount: 2, justification: 'Expanding HR team for recruitment drive', status: 'APPROVED', raisedBy: 'HR Director' },
      { title: 'Talent Acquisition Manager', departmentId: hr.id, headcount: 1, justification: 'Managing executive hires', status: 'PENDING', raisedBy: 'VP Operations' },
      { title: 'QA Automation Engineer', departmentId: qa.id, headcount: 3, justification: 'Testing new platform releases', status: 'APPROVED', raisedBy: 'QA Lead' },
      { title: 'Full Stack Developer', departmentId: it.id, headcount: 2, justification: 'Core backend development', status: 'APPROVED', raisedBy: 'CTO' },
    ],
  });

  console.log('✅ Created sample Job Requisitions!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
