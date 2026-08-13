const { Pool } = require('pg');
require('dotenv').config();

async function createEnumIfNotExists(pool, name, values) {
  const valuesSql = values.map(v => `'${v}'`).join(', ');
  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        CREATE TYPE "${name}" AS ENUM (${valuesSql});
      END IF;
    END
    $$;
  `;
  await pool.query(sql);
}

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring all PostgreSQL ENUM types exist...');

    await createEnumIfNotExists(pool, 'GatePassType', ['INWARD', 'OUTWARD']);
    await createEnumIfNotExists(pool, 'GatePassStatus', ['GATE_IN', 'COMPLETED', 'CANCELLED']);
    await createEnumIfNotExists(pool, 'ProbationStatus', ['UNDER_REVIEW', 'CONFIRMED', 'EXTENDED']);
    await createEnumIfNotExists(pool, 'EmployeeStatus', ['ONBOARDING', 'ACTIVE', 'EXITING', 'RELIEVED']);
    await createEnumIfNotExists(pool, 'JobRequisitionStatus', ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']);
    await createEnumIfNotExists(pool, 'CandidateStatus', ['SOURCED', 'INTERVIEWING', 'SELECTED', 'REJECTED', 'RE_INTERVIEW_ELIGIBLE', 'OFFERED', 'ACCEPTED']);
    await createEnumIfNotExists(pool, 'InterviewStatus', ['SCHEDULED', 'COMPLETED', 'CANCELLED']);
    await createEnumIfNotExists(pool, 'Recommendation', ['SELECT', 'REJECT', 'HOLD']);
    await createEnumIfNotExists(pool, 'OfferStatus', ['GENERATED', 'SENT', 'ACCEPTED', 'DECLINED']);
    await createEnumIfNotExists(pool, 'DocumentStatus', ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED']);
    await createEnumIfNotExists(pool, 'InductionStatus', ['SCHEDULED', 'COMPLETED']);
    await createEnumIfNotExists(pool, 'AttendanceStatus', ['PRESENT', 'ABSENT', 'LATE', 'HALFDAY']);
    await createEnumIfNotExists(pool, 'LeaveStatus', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
    await createEnumIfNotExists(pool, 'AppraisalCycleStatus', ['ACTIVE', 'CLOSED']);
    await createEnumIfNotExists(pool, 'GoalStatus', ['PENDING', 'APPROVED', 'COMPLETED']);
    await createEnumIfNotExists(pool, 'AppraisalReviewStatus', ['DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'COMPLETED']);
    await createEnumIfNotExists(pool, 'TrainingStatus', ['COMPLETED', 'EXPIRED', 'PENDING']);
    await createEnumIfNotExists(pool, 'ExitType', ['RESIGNATION', 'TERMINATION']);
    await createEnumIfNotExists(pool, 'ExitStatus', ['INITIATED', 'CLEARANCE_IN_PROGRESS', 'SETTLED', 'COMPLETED']);
    await createEnumIfNotExists(pool, 'ClearanceStatus', ['PENDING', 'CLEARED']);
    await createEnumIfNotExists(pool, 'PaymentStatus', ['UNPAID', 'PAID']);
    await createEnumIfNotExists(pool, 'TaxRegime', ['OLD', 'NEW']);
    await createEnumIfNotExists(pool, 'RentReceiptStatus', ['SUBMITTED', 'APPROVED', 'REJECTED']);
    await createEnumIfNotExists(pool, 'TaxDeclarationStatus', ['SUBMITTED', 'APPROVED', 'REJECTED']);
    await createEnumIfNotExists(pool, 'LoanStatus', ['ACTIVE', 'PAID_OFF', 'CANCELLED']);
    await createEnumIfNotExists(pool, 'PayrollStatus', ['DRAFT', 'PREVIEW', 'APPROVED', 'PROCESSED']);
    await createEnumIfNotExists(pool, 'PayslipStatus', ['GENERATED', 'PAID']);

    console.log('Successfully created all PostgreSQL ENUM types!');
  } catch (err) {
    console.error('ENUM creation error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
