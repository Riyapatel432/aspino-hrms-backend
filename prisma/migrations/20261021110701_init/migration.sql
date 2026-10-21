-- CreateEnum
CREATE TYPE "GatePassType" AS ENUM ('INWARD', 'OUTWARD');

-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('GATE_IN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProbationStatus" AS ENUM ('UNDER_REVIEW', 'CONFIRMED', 'EXTENDED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'EXITING', 'RELIEVED');

-- CreateEnum
CREATE TYPE "JobRequisitionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "RequisitionType" AS ENUM ('NEW_REQUIREMENT', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "CnvStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_NOTIFICATION', 'NOTIFIED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "CnvSubmissionMode" AS ENUM ('ONLINE_PORTAL', 'EMAIL', 'PHYSICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('SOURCED', 'INTERVIEWING', 'SELECTED', 'REJECTED', 'RE_INTERVIEW_ELIGIBLE', 'OFFERED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('SELECT', 'REJECT', 'HOLD');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('GENERATED', 'SENT', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InductionStatus" AS ENUM ('SCHEDULED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALFDAY', 'ON_LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppraisalCycleStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AppraisalReviewStatus" AS ENUM ('DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('COMPLETED', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "ExitType" AS ENUM ('RESIGNATION', 'TERMINATION');

-- CreateEnum
CREATE TYPE "ExitStatus" AS ENUM ('INITIATED', 'CLEARANCE_IN_PROGRESS', 'SETTLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClearanceStatus" AS ENUM ('PENDING', 'CLEARED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('OLD', 'NEW');

-- CreateEnum
CREATE TYPE "RentReceiptStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxDeclarationStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PREVIEW', 'APPROVED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('GENERATED', 'PAID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "application" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "managerId" TEXT,
    "dateOfJoining" TIMESTAMP(3) NOT NULL,
    "probationEnd" TIMESTAMP(3),
    "probationStatus" "ProbationStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "totalExperienceYears" DOUBLE PRECISION DEFAULT 0.0,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "dob" TIMESTAMP(3),
    "address" TEXT,
    "phone" TEXT,
    "qrToken" TEXT NOT NULL,
    "resumeUrl" TEXT,
    "bankId" INTEGER,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "panNumber" TEXT,
    "aadharNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewRound" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequisition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "jobSpecification" TEXT,
    "experienceRequired" DOUBLE PRECISION DEFAULT 0.0,
    "requisitionType" "RequisitionType" NOT NULL DEFAULT 'NEW_REQUIREMENT',
    "replacementForEmployeeId" TEXT,
    "status" "JobRequisitionStatus" NOT NULL DEFAULT 'PENDING',
    "raisedBy" TEXT NOT NULL,
    "isCnvApplicable" BOOLEAN NOT NULL DEFAULT false,
    "cnvNotificationDate" TIMESTAMP(3),
    "cnvExchangeOffice" TEXT,
    "cnvRefNumber" TEXT,
    "cnvStatus" TEXT DEFAULT 'NOT_REQUIRED',
    "cnvExemptionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnvRecord" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "cnvStatus" "CnvStatus" NOT NULL DEFAULT 'PENDING_NOTIFICATION',
    "employmentExchangeOffice" TEXT,
    "notificationDate" TIMESTAMP(3),
    "submissionMode" "CnvSubmissionMode",
    "referenceNumber" TEXT,
    "acknowledgementNumber" TEXT,
    "acknowledgementDate" TIMESTAMP(3),
    "acknowledgementDocumentUrl" TEXT,
    "cnvRemarks" TEXT,
    "submittedBy" TEXT,
    "acknowledgedBy" TEXT,
    "notificationGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnvRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnvHistory" (
    "id" TEXT NOT NULL,
    "cnvRecordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CnvHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "aadharNumber" TEXT,
    "panNumber" TEXT,
    "dob" TIMESTAMP(3),
    "address" TEXT,
    "resumeUrl" TEXT,
    "source" TEXT NOT NULL,
    "experienceYears" DOUBLE PRECISION DEFAULT 0.0,
    "status" "CandidateStatus" NOT NULL DEFAULT 'SOURCED',
    "isReInterview" BOOLEAN NOT NULL DEFAULT false,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedAt" TIMESTAMP(3),
    "coolOffDaysLeft" INTEGER DEFAULT 0,
    "requisitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSchedule" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewRoundId" TEXT,
    "roundName" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "panelists" TEXT[],
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isReschedule" BOOLEAN NOT NULL DEFAULT false,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InterviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "panelistName" TEXT NOT NULL,
    "panelistId" TEXT,
    "rating" INTEGER NOT NULL,
    "comments" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferLetter" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InductionSchedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "trainer" TEXT NOT NULL,
    "status" "InductionStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "InductionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAccess" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "erpLogin" BOOLEAN NOT NULL DEFAULT false,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "attendanceApp" BOOLEAN NOT NULL DEFAULT false,
    "vpn" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SystemAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "graceTimeMinutes" INTEGER DEFAULT 15,
    "breakDurationMinutes" INTEGER DEFAULT 60,
    "breakRules" TEXT,
    "isNightShift" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT DEFAULT '#0284c7',
    "description" TEXT,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftRoster" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "departmentId" TEXT,
    "managedByHod" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "ShiftRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAuditLog" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT,
    "employeeId" TEXT NOT NULL,
    "oldShiftId" TEXT,
    "oldShiftName" TEXT,
    "newShiftId" TEXT NOT NULL,
    "newShiftName" TEXT NOT NULL,
    "rosterDate" TIMESTAMP(3) NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT NOT NULL,
    "changedByRole" TEXT NOT NULL DEFAULT 'HOD',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "shiftId" TEXT,
    "shiftName" TEXT,
    "totalWorkHours" DOUBLE PRECISION,
    "otHours" DOUBLE PRECISION DEFAULT 0,
    "lateHours" DOUBLE PRECISION DEFAULT 0,
    "earlyGoingHours" DOUBLE PRECISION DEFAULT 0,
    "presentDay" DOUBLE PRECISION DEFAULT 1.0,
    "isHalfDay" BOOLEAN DEFAULT false,
    "isSundayPresent" BOOLEAN DEFAULT false,
    "isFullNightPresent" BOOLEAN DEFAULT false,
    "isHolidayPresent" BOOLEAN DEFAULT false,
    "captureMethod" TEXT DEFAULT 'BIOMETRIC',
    "breakMinutes" INTEGER DEFAULT 0,
    "breakMisuseMinutes" INTEGER DEFAULT 0,
    "breakDeductionHours" DOUBLE PRECISION DEFAULT 0.0,
    "hasBreakComplaint" BOOLEAN DEFAULT false,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakMisuseIncident" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT,
    "employeeId" TEXT NOT NULL,
    "reportedByHodId" TEXT,
    "reportedByName" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "breakType" TEXT NOT NULL,
    "excessMinutes" INTEGER NOT NULL DEFAULT 0,
    "deductionHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "complaintDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakMisuseIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "allocated" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApplication" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "LeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveLedger" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "change" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalCycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AppraisalCycleStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "AppraisalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeGoal" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weightage" INTEGER NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "EmployeeGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "selfRating" DOUBLE PRECISION,
    "selfComments" TEXT,
    "managerRating" DOUBLE PRECISION,
    "managerComments" TEXT,
    "finalRating" DOUBLE PRECISION,
    "status" "AppraisalReviewStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "AppraisalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingName" TEXT NOT NULL,
    "trainingTypeId" TEXT NOT NULL,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" "TrainingStatus" NOT NULL DEFAULT 'COMPLETED',

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitProcess" (
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

-- CreateTable
CREATE TABLE "ClearanceTask" (
    "id" TEXT NOT NULL,
    "exitProcessId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'PENDING',
    "clearedAt" TIMESTAMP(3),
    "clearedBy" TEXT,

    CONSTRAINT "ClearanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FullAndFinalSettlement" (
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

-- CreateTable
CREATE TABLE "PassCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "GatePassType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatePass" (
    "id" TEXT NOT NULL,
    "passNumber" TEXT NOT NULL,
    "type" "GatePassType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "GatePassStatus" NOT NULL DEFAULT 'GATE_IN',
    "imageUrl" TEXT,
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverContact" TEXT,
    "transporterName" TEXT,
    "supplierSource" TEXT,
    "deliveryChallanNumber" TEXT,
    "declaredQuantity" TEXT,
    "poNumber" TEXT,
    "grnNumber" TEXT,
    "invoiceNumber" TEXT,
    "coaGenerated" BOOLEAN NOT NULL DEFAULT false,
    "purpose" TEXT,
    "timeIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeOut" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatePass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "gstNo" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "approvedCategories" TEXT[],
    "approvalStatus" TEXT NOT NULL DEFAULT 'Approved',
    "bankId" INTEGER,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "accountName" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "history" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentLeaveMaster" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentLeaveMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
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

-- CreateTable
CREATE TABLE "SalaryStructure" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HraRentReceipt" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HraRentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDeclaration" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLoan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "loanType" TEXT NOT NULL DEFAULT 'LOAN',
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "monthlyInstallment" DOUBLE PRECISION NOT NULL,
    "balanceRemaining" DOUBLE PRECISION NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "disbursedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "contractReference" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'Approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "gstNo" TEXT,
    "creditTerms" TEXT,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'DOMESTIC',
    "isDomestic" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT DEFAULT 'India',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSubCategory" (
    "id" TEXT NOT NULL,
    "subCategoryCode" TEXT NOT NULL,
    "subCategoryName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT,
    "uom" TEXT NOT NULL,
    "shelfLife" TEXT NOT NULL,
    "storageCondition" TEXT NOT NULL,
    "standardCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "hsnCode" TEXT NOT NULL,
    "qcSpecification" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uom" (
    "id" TEXT NOT NULL,
    "uomCode" TEXT NOT NULL,
    "uomName" TEXT NOT NULL,
    "conversionFactor" DOUBLE PRECISION DEFAULT 1.0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Uom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingMaterial" (
    "id" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "description" TEXT NOT NULL,
    "approvedSuppliers" JSONB,
    "linkedSpecification" TEXT,
    "uom" TEXT NOT NULL,
    "standardCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "minimumStock" DOUBLE PRECISION DEFAULT 0.0,
    "storageCondition" TEXT DEFAULT 'Ambient',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcSpecification" (
    "id" TEXT NOT NULL,
    "specCode" TEXT NOT NULL,
    "productMaterialCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "testParameters" JSONB NOT NULL,
    "testMethod" TEXT,
    "acceptableLimits" TEXT,
    "versionNo" TEXT NOT NULL DEFAULT 'v1.0',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "preparedBy" TEXT,
    "approvedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "warehouse" TEXT DEFAULT 'Main Warehouse',
    "storageCondition" TEXT NOT NULL DEFAULT 'AMBIENT',
    "capacity" TEXT NOT NULL,
    "linkedStoreType" TEXT NOT NULL DEFAULT 'RAW_MATERIAL_STORE',
    "temperatureRange" TEXT,
    "humidityRange" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "permissions_application_module_idx" ON "permissions"("application", "module");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_application_module_action_key" ON "permissions"("application", "module", "action");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_qrToken_key" ON "Employee"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingType_name_key" ON "TrainingType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewRound_name_key" ON "InterviewRound"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CnvRecord_requisitionId_key" ON "CnvRecord"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OfferLetter_candidateId_key" ON "OfferLetter"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "InductionSchedule_employeeId_key" ON "InductionSchedule"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemAccess_employeeId_key" ON "SystemAccess"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExitProcess_employeeId_key" ON "ExitProcess"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "FullAndFinalSettlement_exitProcessId_key" ON "FullAndFinalSettlement"("exitProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "PassCategory_code_key" ON "PassCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GatePass_passNumber_key" ON "GatePass"("passNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_name_key" ON "Bank"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentLeaveMaster_departmentId_fiscalYearId_key" ON "DepartmentLeaveMaster"("departmentId", "fiscalYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryStructure_employeeId_month_year_key" ON "SalaryStructure"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_month_year_key" ON "PayrollRun"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYear_name_key" ON "FiscalYear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_categoryCode_key" ON "ProductCategory"("categoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSubCategory_subCategoryCode_key" ON "ProductSubCategory"("subCategoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "Uom_uomCode_key" ON "Uom"("uomCode");

-- CreateIndex
CREATE UNIQUE INDEX "PackingMaterial_materialCode_key" ON "PackingMaterial"("materialCode");

-- CreateIndex
CREATE UNIQUE INDEX "QcSpecification_specCode_key" ON "QcSpecification"("specCode");

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_locationCode_key" ON "StorageLocation"("locationCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequisition" ADD CONSTRAINT "JobRequisition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequisition" ADD CONSTRAINT "JobRequisition_replacementForEmployeeId_fkey" FOREIGN KEY ("replacementForEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnvRecord" ADD CONSTRAINT "CnvRecord_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnvHistory" ADD CONSTRAINT "CnvHistory_cnvRecordId_fkey" FOREIGN KEY ("cnvRecordId") REFERENCES "CnvRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_interviewRoundId_fkey" FOREIGN KEY ("interviewRoundId") REFERENCES "InterviewRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "InterviewSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_panelistId_fkey" FOREIGN KEY ("panelistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InductionSchedule" ADD CONSTRAINT "InductionSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAccess" ADD CONSTRAINT "SystemAccess_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAuditLog" ADD CONSTRAINT "ShiftAuditLog_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "ShiftRoster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAuditLog" ADD CONSTRAINT "ShiftAuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakMisuseIncident" ADD CONSTRAINT "BreakMisuseIncident_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakMisuseIncident" ADD CONSTRAINT "BreakMisuseIncident_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedger" ADD CONSTRAINT "LeaveLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_trainingTypeId_fkey" FOREIGN KEY ("trainingTypeId") REFERENCES "TrainingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitProcess" ADD CONSTRAINT "ExitProcess_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceTask" ADD CONSTRAINT "ClearanceTask_exitProcessId_fkey" FOREIGN KEY ("exitProcessId") REFERENCES "ExitProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceTask" ADD CONSTRAINT "ClearanceTask_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FullAndFinalSettlement" ADD CONSTRAINT "FullAndFinalSettlement_exitProcessId_fkey" FOREIGN KEY ("exitProcessId") REFERENCES "ExitProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PassCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentLeaveMaster" ADD CONSTRAINT "DepartmentLeaveMaster_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentLeaveMaster" ADD CONSTRAINT "DepartmentLeaveMaster_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HraRentReceipt" ADD CONSTRAINT "HraRentReceipt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HraRentReceipt" ADD CONSTRAINT "HraRentReceipt_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeclaration" ADD CONSTRAINT "TaxDeclaration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeclaration" ADD CONSTRAINT "TaxDeclaration_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubCategory" ADD CONSTRAINT "ProductSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ProductSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
