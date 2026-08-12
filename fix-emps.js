const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.employee.updateMany({ data: { status: 'ACTIVE' } });
  console.log('All employees marked as ACTIVE.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
