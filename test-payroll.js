const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const emps = await prisma.employee.findMany({ include: { salaryStructure: true } }); 
  console.log('Employees:', emps.map(e => ({ id: e.id, status: e.status, hasSalary: !!e.salaryStructure }))); 
  
  const runs = await prisma.payrollRun.findMany({ include: { payslips: true } }); 
  console.log('Payroll Runs:', runs.map(r => ({ month: r.month, payslips: r.payslips.length }))); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
