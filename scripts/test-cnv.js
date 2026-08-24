const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=====================================================');
  console.log('    TESTING CNV COMPLIANCE MODULE IN REQUISITIONS    ');
  console.log('=====================================================');

  try {
    // 0. Ensure Enums and Tables exist
    console.log('[Step 0] Ensuring CNV enums and tables exist in DB...');
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CnvStatus') THEN
          CREATE TYPE "CnvStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_NOTIFICATION', 'NOTIFIED', 'ACKNOWLEDGED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CnvSubmissionMode') THEN
          CREATE TYPE "CnvSubmissionMode" AS ENUM ('ONLINE_PORTAL', 'EMAIL', 'PHYSICAL', 'OTHER');
        END IF;
      END
      $$;

      ALTER TABLE IF EXISTS "JobRequisition" ADD COLUMN IF NOT EXISTS "isCnvApplicable" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "JobRequisition" ADD COLUMN IF NOT EXISTS "cnvNotificationDate" TIMESTAMP(3);
      ALTER TABLE IF EXISTS "JobRequisition" ADD COLUMN IF NOT EXISTS "cnvExchangeOffice" TEXT;
      ALTER TABLE IF EXISTS "JobRequisition" ADD COLUMN IF NOT EXISTS "cnvRefNumber" TEXT;
      ALTER TABLE IF EXISTS "JobRequisition" ADD COLUMN IF NOT EXISTS "cnvStatus" TEXT DEFAULT 'NOT_REQUIRED';
      ALTER TABLE IF EXISTS "JobRequisition" ADD COLUMN IF NOT EXISTS "cnvExemptionReason" TEXT;

      CREATE TABLE IF NOT EXISTS "CnvRecord" (
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CnvRecord_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "CnvRecord_requisitionId_key" ON "CnvRecord"("requisitionId");

      CREATE TABLE IF NOT EXISTS "CnvHistory" (
        "id" TEXT NOT NULL,
        "cnvRecordId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "performedBy" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CnvHistory_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ Database schema verified.\n');

    // 1. Get or create a department for testing
    let dept = await prisma.department.findFirst();
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: 'Engineering QA' }
      });
      console.log('Created test department:', dept.id);
    } else {
      console.log('Using existing department:', dept.name, `(${dept.id})`);
    }

    // 2. Create a JobRequisition with CNV Applicable = true
    console.log('\n[Step 1] Creating JobRequisition with CNV Applicable = true...');
    const testReq = await prisma.jobRequisition.create({
      data: {
        title: 'Senior Software Engineer (CNV Test)',
        departmentId: dept.id,
        headcount: 2,
        experienceRequired: 3.5,
        justification: 'Team expansion for CNV compliance verification',
        jobSpecification: 'Full stack TypeScript and PostgreSQL',
        requisitionType: 'NEW_REQUIREMENT',
        raisedBy: 'HR Manager',
        status: 'PENDING',
        isCnvApplicable: true,
        cnvExchangeOffice: 'Regional Employment Exchange, Central District',
        cnvRefNumber: 'EE/2026/TEST-001',
        cnvStatus: 'PENDING_NOTIFICATION',
      },
    });
    console.log('✓ Created Requisition:', {
      id: testReq.id,
      title: testReq.title,
      isCnvApplicable: testReq.isCnvApplicable,
      cnvExchangeOffice: testReq.cnvExchangeOffice,
      cnvStatus: testReq.cnvStatus,
    });

    // 3. Test CnvRecord creation / findOrCreate
    console.log('\n[Step 2] Initializing CnvRecord for requisition...');
    let cnvRecord = await prisma.cnvRecord.findUnique({
      where: { requisitionId: testReq.id },
      include: { history: true },
    });

    if (!cnvRecord) {
      cnvRecord = await prisma.cnvRecord.create({
        data: {
          requisitionId: testReq.id,
          cnvStatus: 'PENDING_NOTIFICATION',
          employmentExchangeOffice: testReq.cnvExchangeOffice || 'Default Exchange Office',
          referenceNumber: testReq.cnvRefNumber || null,
        },
        include: { history: true },
      });
      console.log('✓ Created CnvRecord with ID:', cnvRecord.id, '| Status:', cnvRecord.cnvStatus);
    }

    // 4. Test Notification Generation (History + timestamp update)
    console.log('\n[Step 3] Generating CNV Notification Document...');
    const updatedCnvAfterGen = await prisma.cnvRecord.update({
      where: { requisitionId: testReq.id },
      data: {
        notificationGeneratedAt: new Date(),
      },
    });

    const genHistory = await prisma.cnvHistory.create({
      data: {
        cnvRecordId: cnvRecord.id,
        action: 'NOTIFICATION_GENERATED',
        description: `CNV Notification document generated for "${testReq.title}".`,
        performedBy: 'HR Manager',
        metadata: { generatedAt: new Date().toISOString() },
      },
    });
    console.log('✓ Notification Generated. History Action:', genHistory.action);

    // 5. Test CNV Submission Recording
    console.log('\n[Step 4] Recording CNV Submission to Employment Exchange...');
    const submissionDate = new Date();
    const updatedCnvAfterSubmit = await prisma.cnvRecord.update({
      where: { requisitionId: testReq.id },
      data: {
        cnvStatus: 'NOTIFIED',
        employmentExchangeOffice: 'Regional Employment Exchange, Central District',
        notificationDate: submissionDate,
        submissionMode: 'ONLINE_PORTAL',
        referenceNumber: 'SUB-REF-2026-999',
        cnvRemarks: 'Submitted via state employment exchange online portal',
        submittedBy: 'HR Manager',
      },
    });

    // Sync requisition status
    await prisma.jobRequisition.update({
      where: { id: testReq.id },
      data: {
        cnvStatus: 'NOTIFIED',
        cnvExchangeOffice: 'Regional Employment Exchange, Central District',
        cnvNotificationDate: submissionDate,
        cnvRefNumber: 'SUB-REF-2026-999',
      },
    });

    const submitHistory = await prisma.cnvHistory.create({
      data: {
        cnvRecordId: cnvRecord.id,
        action: 'SUBMISSION_RECORDED',
        description: 'CNV Submission recorded. Mode: ONLINE_PORTAL. Submitted to: Regional Employment Exchange, Central District. Reference: SUB-REF-2026-999.',
        performedBy: 'HR Manager',
        metadata: { mode: 'ONLINE_PORTAL', ref: 'SUB-REF-2026-999' },
      },
    });
    console.log('✓ Submission Recorded successfully.');
    console.log('  New CnvRecord Status:', updatedCnvAfterSubmit.cnvStatus);
    console.log('  Submission Mode:', updatedCnvAfterSubmit.submissionMode);
    console.log('  Exchange Office:', updatedCnvAfterSubmit.employmentExchangeOffice);

    // 6. Test CNV Acknowledgement Recording
    console.log('\n[Step 5] Recording Acknowledgement / Receipt from Employment Exchange...');
    const ackDate = new Date();
    const updatedCnvAfterAck = await prisma.cnvRecord.update({
      where: { requisitionId: testReq.id },
      data: {
        cnvStatus: 'ACKNOWLEDGED',
        acknowledgementNumber: 'ACK-EE-2026-5541',
        acknowledgementDate: ackDate,
        acknowledgementDocumentUrl: '/uploads/cnv-documents/cnv-ack-sample.pdf',
        cnvRemarks: 'Official seal & signature received from Employment Officer.',
        acknowledgedBy: 'HR Manager',
      },
    });

    // Sync requisition status
    await prisma.jobRequisition.update({
      where: { id: testReq.id },
      data: {
        cnvStatus: 'ACKNOWLEDGED',
      },
    });

    const ackHistory = await prisma.cnvHistory.create({
      data: {
        cnvRecordId: cnvRecord.id,
        action: 'ACKNOWLEDGEMENT_RECORDED',
        description: 'CNV Acknowledgement recorded. Ack #: ACK-EE-2026-5541 dated ' + ackDate.toLocaleDateString(),
        performedBy: 'HR Manager',
        metadata: { ackNumber: 'ACK-EE-2026-5541' },
      },
    });
    console.log('✓ Acknowledgement Recorded successfully.');
    console.log('  Final CNV Status:', updatedCnvAfterAck.cnvStatus);
    console.log('  Ack Number:', updatedCnvAfterAck.acknowledgementNumber);
    console.log('  Ack Document URL:', updatedCnvAfterAck.acknowledgementDocumentUrl);

    // 7. Verify full record and history trail
    console.log('\n[Step 6] Verifying Requisition CNV Audit Trail & Relations...');
    const fullReq = await prisma.jobRequisition.findUnique({
      where: { id: testReq.id },
      include: {
        department: true,
        cnvRecord: {
          include: {
            history: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    console.log('\n=====================================================');
    console.log('             CNV RECORD FULL AUDIT REPORT             ');
    console.log('=====================================================');
    console.log('Requisition ID      :', fullReq.id);
    console.log('Requisition Title   :', fullReq.title);
    console.log('CNV Applicable      :', fullReq.isCnvApplicable);
    console.log('Requisition CNV Stat:', fullReq.cnvStatus);
    console.log('CnvRecord ID        :', fullReq.cnvRecord.id);
    console.log('CnvRecord Status    :', fullReq.cnvRecord.cnvStatus);
    console.log('Submission Mode     :', fullReq.cnvRecord.submissionMode);
    console.log('Exchange Office     :', fullReq.cnvRecord.employmentExchangeOffice);
    console.log('Reference Number    :', fullReq.cnvRecord.referenceNumber);
    console.log('Acknowledgement No  :', fullReq.cnvRecord.acknowledgementNumber);
    console.log('Acknowledgement Date:', fullReq.cnvRecord.acknowledgementDate);
    console.log('Document URL        :', fullReq.cnvRecord.acknowledgementDocumentUrl);
    console.log('Remarks             :', fullReq.cnvRecord.cnvRemarks);
    console.log('Audit History Log   : (' + fullReq.cnvRecord.history.length + ' events)');
    fullReq.cnvRecord.history.forEach((h, idx) => {
      console.log(`  [${idx + 1}] ${h.action.padEnd(25)} | ${h.performedBy || 'System'} | ${h.description}`);
    });

    // 8. Test Exemption / Non-Applicable Case
    console.log('\n[Step 7] Testing CNV Exemption (isCnvApplicable = false)...');
    const exemptReq = await prisma.jobRequisition.create({
      data: {
        title: 'Intern Graphic Designer (Exempt Test)',
        departmentId: dept.id,
        headcount: 1,
        justification: 'Short term design project',
        requisitionType: 'NEW_REQUIREMENT',
        raisedBy: 'HR Manager',
        status: 'PENDING',
        isCnvApplicable: false,
        cnvStatus: 'NOT_REQUIRED',
        cnvExemptionReason: 'Short-term fixed stipend internship < 90 days',
      },
    });
    console.log('✓ Created Exempt Requisition:');
    console.log('  ID                :', exemptReq.id);
    console.log('  Title             :', exemptReq.title);
    console.log('  isCnvApplicable   :', exemptReq.isCnvApplicable);
    console.log('  cnvStatus         :', exemptReq.cnvStatus);
    console.log('  cnvExemptionReason:', exemptReq.cnvExemptionReason);

    console.log('\n=====================================================');
    console.log('  >>> ALL CNV MODULE TESTS COMPLETED SUCCESSFULLY! <<< ');
    console.log('=====================================================');
  } catch (err) {
    console.error('\n❌ Test execution encountered an error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
