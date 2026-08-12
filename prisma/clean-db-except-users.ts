import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🗑️  Starting database cleanup (EXCEPT User table)...');

  await prisma.payslip.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.employeeLoan.deleteMany({});
  await prisma.taxDeclaration.deleteMany({});
  await prisma.hraRentReceipt.deleteMany({});
  await prisma.salaryStructure.deleteMany({});

  await prisma.fullAndFinalSettlement.deleteMany({});
  await prisma.clearanceTask.deleteMany({});
  await prisma.exitProcess.deleteMany({});

  await prisma.trainingRecord.deleteMany({});
  await prisma.appraisalReview.deleteMany({});
  await prisma.employeeGoal.deleteMany({});
  await prisma.appraisalCycle.deleteMany({});

  await prisma.leaveLedger.deleteMany({});
  await prisma.leaveApplication.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.shiftRoster.deleteMany({});
  await prisma.shift.deleteMany({});

  await prisma.systemAccess.deleteMany({});
  await prisma.inductionSchedule.deleteMany({});
  await prisma.onboardingDocument.deleteMany({});

  await prisma.interviewFeedback.deleteMany({});
  await prisma.interviewSchedule.deleteMany({});
  await prisma.offerLetter.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.jobRequisition.deleteMany({});
  await prisma.department.deleteMany({});

  await prisma.employee.deleteMany({});

  await prisma.gatePass.deleteMany({});
  await prisma.passCategory.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.bank.deleteMany({});

  await prisma.departmentLeaveMaster.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.holiday.deleteMany({});
  await prisma.trainingType.deleteMany({});

  console.log('✅ Database cleaned successfully! User table data was preserved.');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
