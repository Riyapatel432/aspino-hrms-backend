import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  private async ensureEnum(name: string, values: string[]) {
    try {
      const valuesSql = values.map((v) => `'${v}'`).join(', ');
      await this.pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
            CREATE TYPE "${name}" AS ENUM (${valuesSql});
          END IF;
        END
        $$;
      `);
    } catch (e) {}
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully.');

      // Ensure all PostgreSQL Enum types exist
      await this.ensureEnum('GatePassType', ['INWARD', 'OUTWARD']);
      await this.ensureEnum('GatePassStatus', ['GATE_IN', 'COMPLETED', 'CANCELLED']);
      await this.ensureEnum('ProbationStatus', ['UNDER_REVIEW', 'CONFIRMED', 'EXTENDED']);
      await this.ensureEnum('EmployeeStatus', ['ONBOARDING', 'ACTIVE', 'EXITING', 'RELIEVED']);
      await this.ensureEnum('JobRequisitionStatus', ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']);
      await this.ensureEnum('CandidateStatus', ['SOURCED', 'INTERVIEWING', 'SELECTED', 'REJECTED', 'RE_INTERVIEW_ELIGIBLE', 'OFFERED', 'ACCEPTED']);
      await this.ensureEnum('InterviewStatus', ['SCHEDULED', 'COMPLETED', 'CANCELLED']);
      await this.ensureEnum('Recommendation', ['SELECT', 'REJECT', 'HOLD']);
      await this.ensureEnum('OfferStatus', ['GENERATED', 'SENT', 'ACCEPTED', 'DECLINED']);
      await this.ensureEnum('DocumentStatus', ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED']);
      await this.ensureEnum('InductionStatus', ['SCHEDULED', 'COMPLETED']);
      await this.ensureEnum('AttendanceStatus', ['PRESENT', 'ABSENT', 'LATE', 'HALFDAY', 'ON_LEAVE', 'HOLIDAY']);
      await this.ensureEnum('LeaveStatus', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
      await this.ensureEnum('AppraisalCycleStatus', ['ACTIVE', 'CLOSED']);
      await this.ensureEnum('GoalStatus', ['PENDING', 'APPROVED', 'COMPLETED']);
      await this.ensureEnum('AppraisalReviewStatus', ['DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'COMPLETED']);
      await this.ensureEnum('TrainingStatus', ['COMPLETED', 'EXPIRED', 'PENDING']);
      await this.ensureEnum('ExitType', ['RESIGNATION', 'TERMINATION']);
      await this.ensureEnum('ExitStatus', ['INITIATED', 'CLEARANCE_IN_PROGRESS', 'SETTLED', 'COMPLETED']);
      await this.ensureEnum('ClearanceStatus', ['PENDING', 'CLEARED']);
      await this.ensureEnum('PaymentStatus', ['UNPAID', 'PAID']);
      await this.ensureEnum('TaxRegime', ['OLD', 'NEW']);
      await this.ensureEnum('RentReceiptStatus', ['SUBMITTED', 'APPROVED', 'REJECTED']);
      await this.ensureEnum('TaxDeclarationStatus', ['SUBMITTED', 'APPROVED', 'REJECTED']);
      await this.ensureEnum('LoanStatus', ['ACTIVE', 'PAID_OFF', 'CANCELLED']);
      await this.ensureEnum('PayrollStatus', ['DRAFT', 'PREVIEW', 'APPROVED', 'PROCESSED']);
      await this.ensureEnum('PayslipStatus', ['GENERATED', 'PAID']);

      // Ensure missing tables and columns exist in PostgreSQL database
      try {
        await this.$executeRawUnsafe(
          `ALTER TABLE IF EXISTS "Department" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;`
        );
        await this.$executeRawUnsafe(`
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "qrToken" TEXT DEFAULT gen_random_uuid()::text;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "phone" TEXT;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "location" TEXT;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "bankId" INTEGER;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "ifscCode" TEXT;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "panNumber" TEXT;
          ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "probationEnd" TIMESTAMP(3);
        `);
        try { await this.$executeRawUnsafe(`ALTER TABLE IF EXISTS "Employee" ALTER COLUMN "department" DROP NOT NULL;`); } catch(e) {}
        try {
          await this.$executeRawUnsafe(`
            DO $$ BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Employee' AND column_name = 'status' AND data_type = 'text') THEN
                ALTER TABLE "Employee" ALTER COLUMN "status" DROP DEFAULT;
                ALTER TABLE "Employee" ALTER COLUMN "status" TYPE "EmployeeStatus" USING "status"::"EmployeeStatus";
                ALTER TABLE "Employee" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"EmployeeStatus";
              END IF;
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LeaveApplication' AND column_name = 'status' AND data_type = 'text') THEN
                ALTER TABLE "LeaveApplication" ALTER COLUMN "status" DROP DEFAULT;
                ALTER TABLE "LeaveApplication" ALTER COLUMN "status" TYPE "LeaveStatus" USING "status"::"LeaveStatus";
                ALTER TABLE "LeaveApplication" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"LeaveStatus";
              END IF;
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Attendance' AND column_name = 'status' AND data_type = 'text') THEN
                ALTER TABLE "Attendance" ALTER COLUMN "status" DROP DEFAULT;
                ALTER TABLE "Attendance" ALTER COLUMN "status" TYPE "AttendanceStatus" USING "status"::"AttendanceStatus";
                ALTER TABLE "Attendance" ALTER COLUMN "status" SET DEFAULT 'PRESENT'::"AttendanceStatus";
              END IF;
            END $$;
          `);
        } catch(e) {}
        try { await this.$executeRawUnsafe(`ALTER TABLE IF EXISTS "Employee" ALTER COLUMN "qrToken" DROP NOT NULL;`); } catch(e) {}
        await this.$executeRawUnsafe(`
          ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "isReInterview" BOOLEAN DEFAULT false;
          ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "rejectionCount" INTEGER DEFAULT 0;
          ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
          ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "coolOffDaysLeft" INTEGER DEFAULT 0;
          ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        `);
        await this.$executeRawUnsafe(`
          ALTER TABLE IF EXISTS "InterviewSchedule" ADD COLUMN IF NOT EXISTS "isReschedule" BOOLEAN DEFAULT false;
          ALTER TABLE IF EXISTS "InterviewSchedule" ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER DEFAULT 1;
          ALTER TABLE IF EXISTS "InterviewFeedback" ADD COLUMN IF NOT EXISTS "panelistId" TEXT;
        `);
        try {
          await this.$executeRawUnsafe(`
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InterviewSchedule' AND column_name = 'panelists' AND data_type != 'ARRAY') THEN
                ALTER TABLE "InterviewSchedule" ALTER COLUMN "panelists" TYPE text[] USING (
                  CASE 
                    WHEN "panelists" IS NULL THEN '{}'::text[]
                    WHEN "panelists"::text LIKE '[%' THEN string_to_array(replace(replace("panelists"::text, '[', ''), ']', ''), ',')::text[]
                    ELSE ARRAY["panelists"::text]::text[]
                  END
                );
              END IF;
            END $$;
          `);
        } catch (e) {}
        await this.$executeRawUnsafe(`
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "otHours" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "lateHours" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "earlyGoingHours" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "presentDay" DOUBLE PRECISION DEFAULT 1.0;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isHalfDay" BOOLEAN DEFAULT false;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isSundayPresent" BOOLEAN DEFAULT false;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isFullNightPresent" BOOLEAN DEFAULT false;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isHolidayPresent" BOOLEAN DEFAULT false;
          ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "captureMethod" TEXT DEFAULT 'BIOMETRIC';
        `);
        await this.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "FiscalYear" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
          );
        `);
        await this.$executeRawUnsafe(
          `CREATE UNIQUE INDEX IF NOT EXISTS "FiscalYear_name_key" ON "FiscalYear"("name");`
        );
        await this.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "TrainingType" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "TrainingType_pkey" PRIMARY KEY ("id")
          );
        `);
        await this.$executeRawUnsafe(
          `CREATE UNIQUE INDEX IF NOT EXISTS "TrainingType_name_key" ON "TrainingType"("name");`
        );
        await this.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "DepartmentLeaveMaster" (
            "id" TEXT NOT NULL,
            "departmentId" TEXT NOT NULL,
            "fiscalYearId" TEXT NOT NULL,
            "casualLeave" INTEGER NOT NULL,
            "sickLeave" INTEGER NOT NULL,
            "earnedLeave" INTEGER NOT NULL,
            "otherLeave" INTEGER NOT NULL DEFAULT 0,
            "totalLeave" INTEGER NOT NULL,
            "effectiveFrom" TIMESTAMP(3) NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "DepartmentLeaveMaster_pkey" PRIMARY KEY ("id")
          );
        `);
        try { await this.$executeRawUnsafe(`ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ALTER COLUMN "department" DROP NOT NULL;`); } catch(e) {}
        try { await this.$executeRawUnsafe(`ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ALTER COLUMN "fiscalYear" DROP NOT NULL;`); } catch(e) {}
        await this.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentLeaveMaster_departmentId_fiscalYearId_key" ON "DepartmentLeaveMaster"("departmentId", "fiscalYearId");
        `);
        await this.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "TrainingRecord" (
            "id" TEXT NOT NULL,
            "employeeId" TEXT NOT NULL,
            "trainingName" TEXT NOT NULL,
            "trainingTypeId" TEXT NOT NULL,
            "completionDate" TIMESTAMP(3) NOT NULL,
            "expiryDate" TIMESTAMP(3),
            "status" TEXT NOT NULL DEFAULT 'COMPLETED',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
          );
        `);
        await this.$executeRawUnsafe(`
          ALTER TABLE IF EXISTS "TrainingRecord" ADD COLUMN IF NOT EXISTS "trainingTypeId" TEXT;
          ALTER TABLE IF EXISTS "TrainingRecord" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE IF EXISTS "TrainingRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        `);
        try { await this.$executeRawUnsafe(`ALTER TABLE IF EXISTS "TrainingRecord" ALTER COLUMN "trainingType" DROP NOT NULL;`); } catch(e) {}
        await this.$executeRawUnsafe(`
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
          await this.$executeRawUnsafe(\`ALTER TABLE IF EXISTS "ClearanceTask" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;\`);
          try { await this.$executeRawUnsafe(\`ALTER TABLE IF EXISTS "ClearanceTask" ALTER COLUMN "department" DROP NOT NULL;\`); } catch(e) {}

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
      } catch (colErr) {
        this.logger.warn(`Schema init warning: ${(colErr as Error).message}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to connect to PostgreSQL database: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
