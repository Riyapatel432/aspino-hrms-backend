const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring all Payroll, Onboarding, Exit, and ActivityLog tables exist in PostgreSQL...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "SalaryStructure" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "month" INTEGER NOT NULL DEFAULT 1,
        "year" INTEGER NOT NULL DEFAULT 2026,
        "basicSalary" DOUBLE PRECISION NOT NULL,
        "hraAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "da" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "conveyance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "statutoryBonus" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "reimbursements" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "grossSalary" DOUBLE PRECISION NOT NULL,
        "pfAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "esiAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "ptAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxRegime" "TaxRegime" NOT NULL DEFAULT 'NEW',
        "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "SalaryStructure_employeeId_month_year_key" ON "SalaryStructure"("employeeId", "month", "year");

      CREATE TABLE IF NOT EXISTS "HraRentReceipt" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "financialYearId" TEXT NOT NULL,
        "landlordName" TEXT NOT NULL,
        "landlordPan" TEXT,
        "landlordAddress" TEXT NOT NULL,
        "monthlyRent" DOUBLE PRECISION NOT NULL,
        "annualRent" DOUBLE PRECISION NOT NULL,
        "rentReceiptUrl" TEXT,
        "status" "RentReceiptStatus" NOT NULL DEFAULT 'SUBMITTED',
        "verifiedBy" TEXT,
        "verifiedAt" TIMESTAMP(3),
        "calculatedExemption" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HraRentReceipt_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "TaxDeclaration" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "financialYearId" TEXT NOT NULL,
        "regime" "TaxRegime" NOT NULL DEFAULT 'NEW',
        "section80C" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "section80D" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "section80G" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "hraExemptionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "status" "TaxDeclarationStatus" NOT NULL DEFAULT 'SUBMITTED',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TaxDeclaration_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "EmployeeLoan" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "loanType" TEXT NOT NULL DEFAULT 'LOAN',
        "principalAmount" DOUBLE PRECISION NOT NULL,
        "monthlyInstallment" DOUBLE PRECISION NOT NULL,
        "balanceRemaining" DOUBLE PRECISION NOT NULL,
        "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
        "disbursedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EmployeeLoan_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "PayrollRun" (
        "id" TEXT NOT NULL,
        "month" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
        "totalEmployees" INTEGER NOT NULL DEFAULT 0,
        "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalNet" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "approvedBy" TEXT,
        "approvedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_month_year_key" ON "PayrollRun"("month", "year");

      CREATE TABLE IF NOT EXISTS "Payslip" (
        "id" TEXT NOT NULL,
        "payrollRunId" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "month" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "totalDays" INTEGER NOT NULL DEFAULT 30,
        "payableDays" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
        "lwpDays" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "otHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "hra" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "da" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "conveyance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "reimbursements" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "grossEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "pfDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "esiDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "ptDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "tdsDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "loanRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "bankName" TEXT,
        "accountNumber" TEXT,
        "ifscCode" TEXT,
        "status" "PayslipStatus" NOT NULL DEFAULT 'GENERATED',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "OnboardingDocument" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "documentType" TEXT NOT NULL,
        "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
        "fileUrl" TEXT,
        "verifiedAt" TIMESTAMP(3),
        CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "InductionSchedule" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "scheduledAt" TIMESTAMP(3) NOT NULL,
        "trainer" TEXT NOT NULL,
        "status" "InductionStatus" NOT NULL DEFAULT 'SCHEDULED',
        CONSTRAINT "InductionSchedule_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "InductionSchedule_employeeId_key" ON "InductionSchedule"("employeeId");

      CREATE TABLE IF NOT EXISTS "SystemAccess" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "erpLogin" BOOLEAN NOT NULL DEFAULT false,
        "email" BOOLEAN NOT NULL DEFAULT false,
        "attendanceApp" BOOLEAN NOT NULL DEFAULT false,
        "vpn" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "SystemAccess_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "SystemAccess_employeeId_key" ON "SystemAccess"("employeeId");

      CREATE TABLE IF NOT EXISTS "ExitProcess" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "type" "ExitType" NOT NULL,
        "resignationDate" TIMESTAMP(3) NOT NULL,
        "noticePeriodDays" INTEGER NOT NULL,
        "lastWorkingDay" TIMESTAMP(3) NOT NULL,
        "reason" TEXT NOT NULL,
        "status" "ExitStatus" NOT NULL DEFAULT 'INITIATED',
        CONSTRAINT "ExitProcess_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "ExitProcess_employeeId_key" ON "ExitProcess"("employeeId");

      CREATE TABLE IF NOT EXISTS "ClearanceTask" (
        "id" TEXT NOT NULL,
        "exitProcessId" TEXT NOT NULL,
        "departmentId" TEXT NOT NULL,
        "taskDescription" TEXT NOT NULL,
        "status" "ClearanceStatus" NOT NULL DEFAULT 'PENDING',
        "clearedAt" TIMESTAMP(3),
        "clearedBy" TEXT,
        CONSTRAINT "ClearanceTask_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "FullAndFinalSettlement" (
        "id" TEXT NOT NULL,
        "exitProcessId" TEXT NOT NULL,
        "pendingSalary" DOUBLE PRECISION NOT NULL,
        "leaveEncashment" DOUBLE PRECISION NOT NULL,
        "bonus" DOUBLE PRECISION NOT NULL,
        "recoveries" DOUBLE PRECISION NOT NULL,
        "netPayable" DOUBLE PRECISION NOT NULL,
        "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
        "settlementDate" TIMESTAMP(3),
        CONSTRAINT "FullAndFinalSettlement_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "FullAndFinalSettlement_exitProcessId_key" ON "FullAndFinalSettlement"("exitProcessId");

      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        "id" TEXT NOT NULL,
        "userId" TEXT,
        "userEmail" TEXT,
        "userName" TEXT,
        "userRole" TEXT,
        "action" TEXT NOT NULL,
        "entityType" TEXT,
        "entityId" TEXT,
        "method" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "ip" TEXT,
        "userAgent" TEXT,
        "statusCode" INTEGER NOT NULL,
        "requestBody" JSONB,
        "queryParams" JSONB,
        "routeParams" JSONB,
        "responseBody" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('Successfully created all Payroll, Onboarding, Exit, and ActivityLog tables!');
  } catch (err) {
    console.error('Table creation error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
