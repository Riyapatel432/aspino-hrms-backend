const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp'
  });

  try {
    console.log('Fixing all enum column data types in PostgreSQL...');

    const enumsToMigrate = [
      { table: 'LeaveApplication', column: 'status', enumType: 'LeaveStatus', defaultVal: 'PENDING' },
      { table: 'LeaveBalance', column: 'leaveType', enumType: 'LeaveType', defaultVal: null },
      { table: 'Attendance', column: 'status', enumType: 'AttendanceStatus', defaultVal: 'PRESENT' },
      { table: 'PayrollRun', column: 'status', enumType: 'PayrollStatus', defaultVal: 'DRAFT' },
      { table: 'Payslip', column: 'status', enumType: 'PayslipStatus', defaultVal: 'GENERATED' },
      { table: 'RentReceipt', column: 'status', enumType: 'RentReceiptStatus', defaultVal: 'SUBMITTED' },
      { table: 'TaxDeclaration', column: 'status', enumType: 'TaxDeclarationStatus', defaultVal: 'SUBMITTED' },
      { table: 'Loan', column: 'status', enumType: 'LoanStatus', defaultVal: 'ACTIVE' },
      { table: 'Candidate', column: 'status', enumType: 'CandidateStatus', defaultVal: 'SOURCED' },
      { table: 'InterviewSchedule', column: 'status', enumType: 'InterviewStatus', defaultVal: 'SCHEDULED' },
      { table: 'OfferLetter', column: 'status', enumType: 'OfferStatus', defaultVal: 'GENERATED' },
      { table: 'OnboardingDocument', column: 'status', enumType: 'DocumentStatus', defaultVal: 'PENDING' },
      { table: 'InductionSchedule', column: 'status', enumType: 'InductionStatus', defaultVal: 'SCHEDULED' },
      { table: 'ExitProcess', column: 'status', enumType: 'ExitStatus', defaultVal: 'INITIATED' },
      { table: 'ExitProcess', column: 'type', enumType: 'ExitType', defaultVal: 'RESIGNATION' },
      { table: 'ClearanceTask', column: 'status', enumType: 'ClearanceStatus', defaultVal: 'PENDING' },
    ];

    for (const item of enumsToMigrate) {
      try {
        const colCheck = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2;
        `, [item.table, item.column]);

        if (colCheck.rows.length > 0 && colCheck.rows[0].data_type === 'text') {
          console.log(`Converting ${item.table}.${item.column} from text to "${item.enumType}"...`);
          await pool.query(`ALTER TABLE "${item.table}" ALTER COLUMN "${item.column}" DROP DEFAULT;`);
          await pool.query(`
            ALTER TABLE "${item.table}" 
            ALTER COLUMN "${item.column}" TYPE "${item.enumType}" 
            USING "${item.column}"::"${item.enumType}";
          `);
          if (item.defaultVal) {
            await pool.query(`ALTER TABLE "${item.table}" ALTER COLUMN "${item.column}" SET DEFAULT '${item.defaultVal}'::"${item.enumType}";`);
          }
          console.log(`✓ Successfully converted ${item.table}.${item.column}!`);
        }
      } catch (err) {
        console.error(`Failed to convert ${item.table}.${item.column}:`, err.message);
      }
    }

    console.log('\nAll enum column migrations complete!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
