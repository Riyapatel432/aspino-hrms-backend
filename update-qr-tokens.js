require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const employees = await prisma.employee.findMany();
  console.log(`Found ${employees.length} employees.`);
  
  const locations = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Remote, USA', 'Bangalore, India'];
  
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const qrToken = emp.qrToken || crypto.randomUUID();
    const phone = emp.phone || `+1 (555) 010-${(100 + i).toString()}`;
    const location = emp.location || locations[i % locations.length];
    
    await prisma.employee.update({
      where: { id: emp.id },
      data: { qrToken, phone, location },
    });
    console.log(`Employee: ${emp.firstName} ${emp.lastName} (${emp.employeeId}) -> qrToken: ${qrToken}, phone: ${phone}, location: ${location}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
