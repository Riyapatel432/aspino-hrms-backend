import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding test data for dynamic LWP...');

  // 1. Create a demo employee
  const employeeId = 'emp-lwp-test-01';
  const existingEmp = await prisma.employee.findUnique({ where: { id: employeeId } });
  
  if (existingEmp) {
    // Clean up previous runs
    await prisma.leaveApplication.deleteMany({ where: { employeeId } });
    await prisma.leaveBalance.deleteMany({ where: { employeeId } });
    await prisma.salaryStructure.deleteMany({ where: { employeeId } });
    await prisma.attendance.deleteMany({ where: { employeeId } });
    await prisma.employee.delete({ where: { id: employeeId } });
  }

  const candidateEmail = 'rahul.testlwp@aspino.com';
  
  // Clean up existing recruitment test data
  const existingCandidate = await prisma.candidate.findUnique({ where: { email: candidateEmail } });
  if (existingCandidate) {
    await prisma.offerLetter.deleteMany({ where: { candidateId: existingCandidate.id } });
    await prisma.candidate.delete({ where: { id: existingCandidate.id } });
  }
  await prisma.jobRequisition.deleteMany({ where: { title: 'Test LWP Requisition' } });

  // 1a. Ensure a department exists for the requisition
  let department = await prisma.department.findUnique({ where: { name: 'Engineering' } });
  if (!department) {
    department = await prisma.department.create({ data: { name: 'Engineering' } });
  }

  // 1b. Create Job Requisition
  const req = await prisma.jobRequisition.create({
    data: {
      title: 'Test LWP Requisition',
      departmentId: department.id,
      headcount: 1,
      justification: 'Testing dynamic LWP functionality',
      status: 'APPROVED',
      raisedBy: 'Admin',
    }
  });

  // 1c. Create Candidate
  const candidate = await prisma.candidate.create({
    data: {
      name: 'Rahul TestLWP',
      email: candidateEmail,
      phone: '9999999999',
      source: 'Portal',
      status: 'ACCEPTED', // Shows as accepted in recruitment
      requisitionId: req.id,
    }
  });

  // 1d. Create Offer Letter
  await prisma.offerLetter.create({
    data: {
      candidateId: candidate.id,
      role: 'Software Engineer',
      salary: 50000,
      joiningDate: new Date(),
      status: 'ACCEPTED',
    }
  });

  const employee = await prisma.employee.create({
    data: {
      id: employeeId,
      employeeId: 'ASP-LWP-001',
      firstName: 'Rahul',
      lastName: 'TestLWP',
      email: 'rahul.testlwp@aspino.com',
      department: 'Engineering',
      designation: 'Software Engineer',
      dateOfJoining: new Date(),
      status: 'ACTIVE',
      probationStatus: 'CONFIRMED'
    },
  });

  // 2. Setup Salary Structure (Gross: 50,000)
  await prisma.salaryStructure.create({
    data: {
      employeeId: employee.id,
      basicSalary: 25000,
      hraAmount: 12500,
      da: 0,
      conveyance: 2500,
      specialAllowance: 10000,
      statutoryBonus: 0,
      reimbursements: 0,
      grossSalary: 50000,
      pfAmount: 1800,
      esiAmount: 0,
      ptAmount: 200,
      taxRegime: 'NEW',
    },
  });

  // 3. Allocate ONLY 'Casual' and 'Sick' leaves in their LeaveBalance
  // Because 'Personal Emergency' is NOT in this list, it will be treated as Unpaid/LWP dynamically.
  await prisma.leaveBalance.createMany({
    data: [
      { employeeId: employee.id, leaveType: 'Casual', allocated: 5, used: 0 },
      { employeeId: employee.id, leaveType: 'Sick', allocated: 5, used: 0 },
    ],
  });

  // 4. Create Leave Applications
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // Current month

  // Leave 1: Paid Leave (Casual) - 1 day
  const casualStart = new Date(year, month, 5);
  await prisma.leaveApplication.create({
    data: {
      employeeId: employee.id,
      leaveType: 'Casual', // This IS in LeaveBalance -> Paid
      startDate: casualStart,
      endDate: casualStart,
      reason: 'Fever',
      status: 'APPROVED',
    },
  });

  // Leave 2: Dynamic LWP (Personal Emergency) - 3 days
  // Because 'Personal Emergency' is not in their LeaveBalance, the dynamic logic will subtract these 3 days from their salary.
  const lwpStart = new Date(year, month, 10);
  const lwpEnd = new Date(year, month, 12);
  await prisma.leaveApplication.create({
    data: {
      employeeId: employee.id,
      leaveType: 'Personal Emergency', // NOT in LeaveBalance -> Treated as LWP!
      startDate: lwpStart,
      endDate: lwpEnd,
      reason: 'Urgent family work',
      status: 'APPROVED',
    },
  });

  console.log('✅ Seeding complete!');
  console.log('---------------------------------------------------------');
  console.log('Employee: Rahul TestLWP (ASP-LWP-001)');
  console.log('Gross Salary: ₹50,000');
  console.log('Paid Leaves taken: 1 day (Casual)');
  console.log('Unpaid Leaves (Dynamic LWP) taken: 3 days (Personal Emergency)');
  console.log(`\n👉 Run payroll for month ${month + 1}, ${year} to see the 3 LWP days automatically deducted from their salary!`);
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
