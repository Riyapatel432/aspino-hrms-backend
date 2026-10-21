/**
 * Complete ERP Production-Level API Integration & Security Test Suite
 * Tests against live NestJS Server (http://127.0.0.1:5000) and PostgreSQL
 */
const request = require('supertest');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'http://127.0.0.1:5000';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
  modules: {
    'Quotations': { total: 0, passed: 0, failed: 0 },
    'Purchase Orders': { total: 0, passed: 0, failed: 0 },
    'Invoices': { total: 0, passed: 0, failed: 0 },
    'Credit Notes': { total: 0, passed: 0, failed: 0 },
    'Debit Notes': { total: 0, passed: 0, failed: 0 },
    'Delivery Challans': { total: 0, passed: 0, failed: 0 },
    'Activity Logs': { total: 0, passed: 0, failed: 0 },
    'Security & CASL': { total: 0, passed: 0, failed: 0 },
  },
};

function recordTest(moduleName, testName, isPassed, errorMsg = null) {
  results.total++;
  results.modules[moduleName].total++;
  if (isPassed) {
    results.passed++;
    results.modules[moduleName].passed++;
    console.log(`  ✅ [${moduleName}] ${testName}`);
  } else {
    results.failed++;
    results.modules[moduleName].failed++;
    results.failures.push({ module: moduleName, test: testName, error: errorMsg });
    console.error(`  ❌ [${moduleName}] ${testName} -> FAILED: ${errorMsg}`);
  }
}

async function runSuite() {
  console.log('========================================================================');
  console.log('  STARTING ERP PRODUCTION-LEVEL API & DATABASE TEST SUITE');
  console.log('  Target Base URL:', BASE_URL);
  console.log('========================================================================\n');

  // 1. Prepare Auth Tokens
  const adminRes = await pool.query('SELECT id, email, role FROM "User" WHERE email = $1', ['admin@aspino.com']);
  if (!adminRes.rows[0]) throw new Error('admin@aspino.com not found in User table');
  const adminUser = adminRes.rows[0];

  const empRes = await pool.query('SELECT id, email, role FROM "User" WHERE role = $1 LIMIT 1', ['EMPLOYEE']);
  const empUser = empRes.rows[0] || { id: 'mock-emp', email: 'employee@aspino.com', role: 'EMPLOYEE' };

  const adminToken = jwt.sign(
    { sub: adminUser.id, email: adminUser.email, role: 'SUPER_ADMIN' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const employeeToken = jwt.sign(
    { sub: empUser.id, email: empUser.email, role: 'EMPLOYEE' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const expiredToken = jwt.sign(
    { sub: adminUser.id, email: adminUser.email, role: 'SUPER_ADMIN' },
    JWT_SECRET,
    { expiresIn: '-10s' }
  );

  let testQuotationId = null;
  let testPoId = null;
  let testInvoiceId = null;
  let testCreditNoteId = null;
  let testDebitNoteId = null;
  let testChallanId = null;

  try {
    // ==========================================
    // 1. MODULE: QUOTATIONS
    // ==========================================
    console.log('\n--- Testing Module: Quotations ---');

    // 1.1 Generate Number
    try {
      const res = await request(BASE_URL)
        .get('/quotation/generate-number')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && /^QTN-\d{4}-\d{4}$/.test(res.body.quotationNumber);
      recordTest('Quotations', 'Generate sequential quotation number', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Quotations', 'Generate sequential quotation number', false, e.message);
    }

    // 1.2 Negative Validation: Empty customerName
    try {
      const res = await request(BASE_URL)
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: '',
          items: [{ itemName: 'Item X', quantity: 10, unitPrice: 100 }],
        });
      const ok = res.status === 400;
      recordTest('Quotations', 'Reject empty customerName with 400', ok, !ok ? `Expected 400, got ${res.status}` : null);
    } catch (e) {
      recordTest('Quotations', 'Reject empty customerName with 400', false, e.message);
    }

    // 1.3 Negative Validation: Invalid dates (validUntil < quotationDate)
    try {
      const res = await request(BASE_URL)
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Astra Pharma',
          quotationDate: '2026-10-25',
          validUntil: '2026-10-10',
          items: [{ itemName: 'Item X', quantity: 10, unitPrice: 100 }],
        });
      const ok = res.status === 400;
      recordTest('Quotations', 'Reject validUntil earlier than quotationDate with 400', ok, !ok ? `Expected 400, got ${res.status}` : null);
    } catch (e) {
      recordTest('Quotations', 'Reject validUntil earlier than quotationDate with 400', false, e.message);
    }

    // 1.4 Negative Validation: Non-positive quantity
    try {
      const res = await request(BASE_URL)
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Astra Pharma',
          items: [{ itemName: 'Item X', quantity: 0, unitPrice: 100 }],
        });
      const ok = res.status === 400;
      recordTest('Quotations', 'Reject zero quantity with 400', ok, !ok ? `Expected 400, got ${res.status}` : null);
    } catch (e) {
      recordTest('Quotations', 'Reject zero quantity with 400', false, e.message);
    }

    // 1.5 CREATE: Quotation with financial calculations
    try {
      const res = await request(BASE_URL)
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Zydus Healthcare Ltd',
          customerEmail: 'procurement@zydus.com',
          customerPhone: '9876543210',
          billingAddress: 'Plot 45 GIDC, Ahmedabad',
          shippingAddress: 'Plot 45 GIDC, Ahmedabad',
          gstNo: '24AAACZ0000A1Z2',
          discountPercentage: 5,
          taxPercentage: 10,
          shippingCharges: 200,
          items: [
            {
              itemName: 'Amoxicillin Trihydrate USP',
              hsnCode: '2941',
              uom: 'KGS',
              quantity: 100,
              unitPrice: 50,
              discountPercent: 10,
              taxPercent: 18,
            },
            {
              itemName: 'Microcrystalline Cellulose',
              hsnCode: '3912',
              uom: 'KGS',
              quantity: 50,
              unitPrice: 100,
              discountPercent: 0,
              taxPercent: 12,
            },
          ],
        });
      const q = res.body.quotation || res.body;
      testQuotationId = q.id;
      const ok = res.status === 201 &&
        q.subTotal === 9500 &&
        q.discountAmount === 475 &&
        q.taxAmount === 902.5 &&
        q.shippingCharges === 200 &&
        q.totalAmount === 10127.5;
      recordTest('Quotations', 'Create quotation with multi-items and accurate calculations', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Quotations', 'Create quotation with multi-items and accurate calculations', false, e.message);
    }

    // 1.6 READ: List with search
    try {
      const res = await request(BASE_URL)
        .get('/quotation?search=Zydus&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && Array.isArray(res.body.data) && res.body.data.some(q => q.id === testQuotationId);
      recordTest('Quotations', 'List quotations with search filter and pagination', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Quotations', 'List quotations with search filter and pagination', false, e.message);
    }

    // 1.7 READ: By ID
    try {
      const res = await request(BASE_URL)
        .get(`/quotation/${testQuotationId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.body.id === testQuotationId && res.body.items.length === 2;
      recordTest('Quotations', 'Get quotation by ID with line items', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Quotations', 'Get quotation by ID with line items', false, e.message);
    }

    // 1.8 UPDATE: Change charges
    try {
      const res = await request(BASE_URL)
        .patch(`/quotation/${testQuotationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Urgent Dispatch', shippingCharges: 250 });
      const q = res.body.quotation || res.body;
      const ok = res.status === 200 && q.shippingCharges === 250;
      recordTest('Quotations', 'Update quotation fields', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Quotations', 'Update quotation fields', false, e.message);
    }

    // 1.9 STATUS: Change status to ACCEPTED
    try {
      const res = await request(BASE_URL)
        .patch(`/quotation/${testQuotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACCEPTED' });
      const ok = res.status === 200 && (res.body.quotation?.status === 'ACCEPTED' || res.body.status === 'ACCEPTED');
      recordTest('Quotations', 'Transition quotation status to ACCEPTED', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Quotations', 'Transition quotation status to ACCEPTED', false, e.message);
    }

    // 1.10 PDF: Download PDF
    try {
      const res = await request(BASE_URL)
        .get(`/quotation/${testQuotationId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.header['content-type'] === 'application/pdf' && res.body.length > 0;
      recordTest('Quotations', 'Generate and stream Quotation PDF', ok, !ok ? `Status: ${res.status}, Type: ${res.header['content-type']}` : null);
    } catch (e) {
      recordTest('Quotations', 'Generate and stream Quotation PDF', false, e.message);
    }

    // 1.11 DUPLICATE
    try {
      const res = await request(BASE_URL)
        .post(`/quotation/${testQuotationId}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`);
      const dupId = res.body.quotation?.id || res.body.id;
      const ok = res.status === 201 && dupId && dupId !== testQuotationId;
      if (dupId) await pool.query('DELETE FROM "Quotation" WHERE id = $1', [dupId]);
      recordTest('Quotations', 'Duplicate quotation into new draft', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Quotations', 'Duplicate quotation into new draft', false, e.message);
    }

    // ==========================================
    // 2. MODULE: PURCHASE ORDERS
    // ==========================================
    console.log('\n--- Testing Module: Purchase Orders ---');

    // 2.1 Next Number
    try {
      const res = await request(BASE_URL)
        .get('/purchase-order/next-number?type=PROCUREMENT')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && /^PO-\d{4}-\d{4}$/.test(res.body.nextNumber);
      recordTest('Purchase Orders', 'Generate sequential PO number', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Purchase Orders', 'Generate sequential PO number', false, e.message);
    }

    // 2.2 Negative Validation: Empty partyName
    try {
      const res = await request(BASE_URL)
        .post('/purchase-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: '',
          items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }],
        });
      const ok = res.status === 400;
      recordTest('Purchase Orders', 'Reject empty partyName with 400', ok, !ok ? `Expected 400, got ${res.status}` : null);
    } catch (e) {
      recordTest('Purchase Orders', 'Reject empty partyName with 400', false, e.message);
    }

    // 2.3 CREATE: Procurement PO
    try {
      const res = await request(BASE_URL)
        .post('/purchase-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: 'Aarti Industries Ltd',
          partyEmail: 'sales@aarti.com',
          partyGstNo: '24AAACA1111A1Z1',
          type: 'PROCUREMENT',
          taxType: 'GST',
          taxPercentage: 18,
          shippingCharges: 500,
          paymentTerms: '30 Days Net',
          items: [
            {
              itemName: 'Sulfuric Acid CP Grade',
              hsnCode: '2807',
              uom: 'LTRS',
              quantity: 200,
              unitPrice: 40,
              taxPercent: 18,
            },
          ],
        });
      const po = res.body.purchaseOrder || res.body;
      testPoId = po.id;
      const ok = res.status === 201 &&
        po.subTotal === 8000 &&
        po.taxAmount === 1440 &&
        po.shippingCharges === 500 &&
        po.totalAmount === 9940;
      recordTest('Purchase Orders', 'Create procurement PO with calculations', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Purchase Orders', 'Create procurement PO with calculations', false, e.message);
    }

    // 2.4 WORKFLOW: Convert Quotation -> PO
    try {
      const res = await request(BASE_URL)
        .post(`/purchase-order/from-quotation/${testQuotationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'SALES', notes: 'Converted from Approved Quote' });
      const convertedPoId = res.body.purchaseOrder?.id || res.body.id;
      const ok = res.status === 201 && convertedPoId;
      if (convertedPoId) await pool.query('DELETE FROM "PurchaseOrder" WHERE id = $1', [convertedPoId]);
      recordTest('Purchase Orders', 'Workflow: Convert Quotation -> Purchase Order', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Purchase Orders', 'Workflow: Convert Quotation -> Purchase Order', false, e.message);
    }

    // 2.5 STATUS: Change to ISSUED
    try {
      const res = await request(BASE_URL)
        .patch(`/purchase-order/${testPoId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ISSUED' });
      const ok = res.status === 200 && (res.body.purchaseOrder?.status === 'ISSUED' || res.body.status === 'ISSUED');
      recordTest('Purchase Orders', 'Transition PO status to ISSUED', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Purchase Orders', 'Transition PO status to ISSUED', false, e.message);
    }

    // 2.6 PDF: Download PO PDF
    try {
      const res = await request(BASE_URL)
        .get(`/purchase-order/${testPoId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.header['content-type'] === 'application/pdf' && res.body.length > 0;
      recordTest('Purchase Orders', 'Generate and stream Purchase Order PDF', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Purchase Orders', 'Generate and stream Purchase Order PDF', false, e.message);
    }

    // ==========================================
    // 3. MODULE: INVOICES
    // ==========================================
    console.log('\n--- Testing Module: Invoices ---');

    // 3.1 Next Number
    try {
      const res = await request(BASE_URL)
        .get('/invoice/next-number?type=SALES')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && /^INV-\d{4}-\d{4}$/.test(res.body.nextNumber);
      recordTest('Invoices', 'Generate sequential Invoice number', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Invoices', 'Generate sequential Invoice number', false, e.message);
    }

    // 3.2 Negative Validation: Empty partyName
    try {
      const res = await request(BASE_URL)
        .post('/invoice')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: '',
          items: [{ itemName: 'Item X', quantity: 1, unitPrice: 100 }],
        });
      const ok = res.status === 400;
      recordTest('Invoices', 'Reject empty partyName with 400', ok, !ok ? `Expected 400, got ${res.status}` : null);
    } catch (e) {
      recordTest('Invoices', 'Reject empty partyName with 400', false, e.message);
    }

    // 3.3 CREATE (Intra-State GST): Split CGST & SGST
    try {
      const res = await request(BASE_URL)
        .post('/invoice')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'SALES',
          partyName: 'Cipla Healthcare Ltd',
          partyGstNo: '36AAACC1234A1Z0',
          taxType: 'GST',
          taxPercentage: 18,
          paidAmount: 5000,
          items: [
            {
              itemName: 'Ciprofloxacin Tablets 500mg',
              hsnCode: '3004',
              uom: 'STRIP',
              batchNumber: 'BATCH-CIP-2026',
              quantity: 100,
              unitPrice: 100,
              taxPercent: 18,
            },
          ],
        });
      testInvoiceId = res.body.id;
      const ok = res.status === 201 &&
        res.body.subTotal === 10000 &&
        res.body.cgstAmount === 900 &&
        res.body.sgstAmount === 900 &&
        res.body.igstAmount === 0 &&
        res.body.totalAmount === 11800 &&
        res.body.paidAmount === 5000 &&
        res.body.balanceAmount === 6800;
      recordTest('Invoices', 'Create Intra-State GST invoice with CGST/SGST split and balance tracking', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Invoices', 'Create Intra-State GST invoice with CGST/SGST split and balance tracking', false, e.message);
    }

    // 3.4 CREATE (Inter-State IGST)
    try {
      const res = await request(BASE_URL)
        .post('/invoice')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'SALES',
          partyName: 'Fortis Hospital Mumbai',
          partyGstNo: '27AAACF9876A1Z3',
          taxType: 'IGST',
          taxPercentage: 12,
          items: [{ itemName: 'Gel 30g', quantity: 50, unitPrice: 80, taxPercent: 12 }],
        });
      const tempId = res.body.id;
      const ok = res.status === 201 && res.body.cgstAmount === 0 && res.body.igstAmount === 480 && res.body.totalAmount === 4480;
      if (tempId) await pool.query('DELETE FROM "Invoice" WHERE id = $1', [tempId]);
      recordTest('Invoices', 'Create Inter-State IGST invoice with correct tax routing', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Invoices', 'Create Inter-State IGST invoice with correct tax routing', false, e.message);
    }

    // 3.5 WORKFLOW: Convert PO -> Invoice
    try {
      const res = await request(BASE_URL)
        .post(`/invoice/from-po/${testPoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Invoice generated from PO' });
      const createdInvId = res.body.id;
      const ok = res.status === 201 && res.body.purchaseOrderId === testPoId;
      if (createdInvId) await pool.query('DELETE FROM "Invoice" WHERE id = $1', [createdInvId]);
      recordTest('Invoices', 'Workflow: Convert Purchase Order -> Invoice', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Invoices', 'Workflow: Convert Purchase Order -> Invoice', false, e.message);
    }

    // 3.6 PDF: Download Invoice PDF
    try {
      const res = await request(BASE_URL)
        .get(`/invoice/${testInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.header['content-type'] === 'application/pdf' && res.body.length > 0;
      recordTest('Invoices', 'Generate and stream Invoice PDF', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Invoices', 'Generate and stream Invoice PDF', false, e.message);
    }

    // ==========================================
    // 4. MODULE: CREDIT NOTES
    // ==========================================
    console.log('\n--- Testing Module: Credit Notes ---');

    // 4.1 Next Number
    try {
      const res = await request(BASE_URL)
        .get('/credit-debit-note/next-number?type=CREDIT_NOTE')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && /^CN-\d{4}-\d{4}$/.test(res.body.nextNumber);
      recordTest('Credit Notes', 'Generate sequential Credit Note number', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Credit Notes', 'Generate sequential Credit Note number', false, e.message);
    }

    // 4.2 Negative Validation: Empty reason
    try {
      const res = await request(BASE_URL)
        .post('/credit-debit-note')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT_NOTE',
          partyName: 'Cipla Healthcare Ltd',
          reason: '',
          items: [{ itemName: 'Item X', quantity: 1, unitPrice: 10 }],
        });
      const ok = res.status === 400;
      recordTest('Credit Notes', 'Reject empty reason with 400', ok, !ok ? `Expected 400, got ${res.status}` : null);
    } catch (e) {
      recordTest('Credit Notes', 'Reject empty reason with 400', false, e.message);
    }

    // 4.3 WORKFLOW: Create Credit Note against Invoice
    try {
      const res = await request(BASE_URL)
        .post(`/credit-debit-note/from-invoice/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT_NOTE',
          reason: 'Damaged strips during shipment',
          items: [
            {
              itemName: 'Ciprofloxacin Tablets 500mg',
              quantity: 10,
              unitPrice: 100,
              taxPercent: 18,
            },
          ],
        });
      testCreditNoteId = res.body.id;
      const ok = res.status === 201 &&
        res.body.invoiceId === testInvoiceId &&
        res.body.subTotal === 1000 &&
        res.body.taxAmount === 180 &&
        res.body.totalAmount === 1180;
      recordTest('Credit Notes', 'Workflow: Create Credit Note against Invoice with return calculations', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Credit Notes', 'Workflow: Create Credit Note against Invoice with return calculations', false, e.message);
    }

    // 4.4 STATUS: Transition to ISSUED
    try {
      const res = await request(BASE_URL)
        .patch(`/credit-debit-note/${testCreditNoteId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ISSUED' });
      const ok = res.status === 200 && res.body.status === 'ISSUED';
      recordTest('Credit Notes', 'Transition Credit Note status to ISSUED', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Credit Notes', 'Transition Credit Note status to ISSUED', false, e.message);
    }

    // 4.5 PDF: Download Credit Note PDF
    try {
      const res = await request(BASE_URL)
        .get(`/credit-debit-note/${testCreditNoteId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.header['content-type'] === 'application/pdf' && res.body.length > 0;
      recordTest('Credit Notes', 'Generate and stream Credit Note PDF', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Credit Notes', 'Generate and stream Credit Note PDF', false, e.message);
    }

    // ==========================================
    // 5. MODULE: DEBIT NOTES
    // ==========================================
    console.log('\n--- Testing Module: Debit Notes ---');

    // 5.1 Next Number
    try {
      const res = await request(BASE_URL)
        .get('/credit-debit-note/next-number?type=DEBIT_NOTE')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && /^DN-\d{4}-\d{4}$/.test(res.body.nextNumber);
      recordTest('Debit Notes', 'Generate sequential Debit Note number', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Debit Notes', 'Generate sequential Debit Note number', false, e.message);
    }

    // 5.2 CREATE: Debit Note
    try {
      const res = await request(BASE_URL)
        .post('/credit-debit-note')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DEBIT_NOTE',
          partyName: 'Aarti Industries Ltd',
          reason: 'Supplier Undercharge Correction',
          taxType: 'GST',
          taxPercentage: 18,
          items: [
            {
              itemName: 'Rate differential adjustment',
              quantity: 1,
              unitPrice: 500,
              taxPercent: 18,
            },
          ],
        });
      testDebitNoteId = res.body.id;
      const ok = res.status === 201 &&
        res.body.type === 'DEBIT_NOTE' &&
        res.body.subTotal === 500 &&
        res.body.taxAmount === 90 &&
        res.body.totalAmount === 590;
      recordTest('Debit Notes', 'Create Debit Note with GST adjustment calculations', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Debit Notes', 'Create Debit Note with GST adjustment calculations', false, e.message);
    }

    // 5.3 PDF: Download Debit Note PDF
    try {
      const res = await request(BASE_URL)
        .get(`/credit-debit-note/${testDebitNoteId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.header['content-type'] === 'application/pdf' && res.body.length > 0;
      recordTest('Debit Notes', 'Generate and stream Debit Note PDF', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Debit Notes', 'Generate and stream Debit Note PDF', false, e.message);
    }

    // ==========================================
    // 6. MODULE: DELIVERY CHALLANS
    // ==========================================
    console.log('\n--- Testing Module: Delivery Challans ---');

    // 6.1 Next Number
    try {
      const res = await request(BASE_URL)
        .get('/delivery-challan/next-number')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && /^DC-\d{4}-\d{4}$/.test(res.body.nextNumber);
      recordTest('Delivery Challans', 'Generate sequential Challan number', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Delivery Challans', 'Generate sequential Challan number', false, e.message);
    }

    // 6.2 CREATE: Delivery Challan with GST Rule 55 JOB_WORK supply type
    try {
      const res = await request(BASE_URL)
        .post('/delivery-challan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: 'Pharma Packaging Solutions Ltd',
          challanType: 'JOB_WORK',
          transportMode: 'Road',
          vehicleNumber: 'TS07UA9876',
          transporterName: 'Om Logistics',
          lrNumber: 'LR-2026-4432',
          eWayBillNumber: '112233445566',
          dispatchAddress: 'Aspino Formulation Unit 1, Hyderabad',
          shippingAddress: 'Industrial Area Phase 2, Medchal',
          taxType: 'GST',
          taxAmount: 3600,
          otherCharges: 150,
          items: [
            {
              itemName: 'Lyophilized Vials (Unlabelled)',
              hsnCode: '3004',
              uom: 'VIALS',
              quantity: 50,
              unitPrice: 400,
              taxPercent: 18,
            },
          ],
        });
      testChallanId = res.body.id;
      const ok = res.status === 201 &&
        res.body.challanType === 'JOB_WORK' &&
        res.body.vehicleNumber === 'TS07UA9876' &&
        res.body.subTotal === 20000 &&
        res.body.totalAmount === 23750;
      recordTest('Delivery Challans', 'Create Delivery Challan with Rule 55 transport & consignment details', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Delivery Challans', 'Create Delivery Challan with Rule 55 transport & consignment details', false, e.message);
    }

    // 6.3 STATISTICS: Dashboard KPI Cards
    try {
      const res = await request(BASE_URL)
        .get('/delivery-challan/statistics')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 &&
        typeof res.body.totalChallans === 'number' &&
        typeof res.body.draftCount === 'number' &&
        typeof res.body.issuedCount === 'number' &&
        typeof res.body.deliveredCount === 'number' &&
        typeof res.body.cancelledCount === 'number' &&
        typeof res.body.totalValue === 'number';
      recordTest('Delivery Challans', 'Verify KPI statistics endpoint counters & consignment value', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Delivery Challans', 'Verify KPI statistics endpoint counters & consignment value', false, e.message);
    }

    // 6.4 STATUS: Lifecycle DRAFT -> ISSUED -> DELIVERED
    try {
      const res1 = await request(BASE_URL)
        .patch(`/delivery-challan/${testChallanId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ISSUED' });

      const res2 = await request(BASE_URL)
        .patch(`/delivery-challan/${testChallanId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED' });

      const ok = res1.status === 200 && res1.body.status === 'ISSUED' &&
                 res2.status === 200 && res2.body.status === 'DELIVERED';
      recordTest('Delivery Challans', 'Status lifecycle transitions (DRAFT -> ISSUED -> DELIVERED)', ok, !ok ? `Res1: ${res1.status}, Res2: ${res2.status}` : null);
    } catch (e) {
      recordTest('Delivery Challans', 'Status lifecycle transitions (DRAFT -> ISSUED -> DELIVERED)', false, e.message);
    }

    // 6.5 PDF: Download Challan PDF
    try {
      const res = await request(BASE_URL)
        .get(`/delivery-challan/${testChallanId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.header['content-type'] === 'application/pdf' && res.body.length > 0;
      recordTest('Delivery Challans', 'Generate and stream Delivery Challan PDF', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Delivery Challans', 'Generate and stream Delivery Challan PDF', false, e.message);
    }

    // 6.6 SOFT DELETE: Soft delete Delivery Challan
    try {
      const res = await request(BASE_URL)
        .delete(`/delivery-challan/${testChallanId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.body.isActive === false;
      recordTest('Delivery Challans', 'Soft delete delivery challan (isActive: false)', ok, !ok ? JSON.stringify(res.body) : null);
    } catch (e) {
      recordTest('Delivery Challans', 'Soft delete delivery challan (isActive: false)', false, e.message);
    }

    // ==========================================
    // 7. MODULE: ACTIVITY LOGS
    // ==========================================
    console.log('\n--- Testing Module: Activity Logs ---');

    // 7.1 READ: List logs with pagination
    try {
      const res = await request(BASE_URL)
        .get('/staff-hrms/audit/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && (Array.isArray(res.body.data) || Array.isArray(res.body)) && Boolean(res.body.pagination || res.body.meta);
      recordTest('Activity Logs', 'List activity logs with pagination and metadata', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Activity Logs', 'List activity logs with pagination and metadata', false, e.message);
    }

    // 7.2 FILTER: Filter by userEmail
    try {
      await pool.query(
        `INSERT INTO "ActivityLog" (id, "userEmail", "userName", "userRole", action, method, url, "statusCode", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        ['test-act-log-uuid', 'qa.lead@aspino.com', 'QA Lead', 'TEST_LEAD', 'ERP_MODULE_VERIFICATION', 'POST', '/quotation', 201]
      );

      const res = await request(BASE_URL)
        .get('/staff-hrms/audit/logs?userEmail=qa.lead@aspino.com')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && res.body.data.some(l => l.userEmail === 'qa.lead@aspino.com');
      await pool.query('DELETE FROM "ActivityLog" WHERE id = $1', ['test-act-log-uuid']);
      recordTest('Activity Logs', 'Filter activity logs by userEmail and action', ok, !ok ? `Status: ${res.status}` : null);
    } catch (e) {
      recordTest('Activity Logs', 'Filter activity logs by userEmail and action', false, e.message);
    }

    // ==========================================
    // 8. SECURITY & CASL PERMISSIONS
    // ==========================================
    console.log('\n--- Testing Security & CASL RBAC Authorization ---');

    // 8.1 Missing Token -> 401
    try {
      const res = await request(BASE_URL).get('/quotation');
      const ok = res.status === 401;
      recordTest('Security & CASL', 'Unauthenticated request rejected with 401 Unauthorized', ok, !ok ? `Expected 401, got ${res.status}` : null);
    } catch (e) {
      recordTest('Security & CASL', 'Unauthenticated request rejected with 401 Unauthorized', false, e.message);
    }

    // 8.2 Expired Token -> 401
    try {
      const res = await request(BASE_URL)
        .get('/quotation')
        .set('Authorization', `Bearer ${expiredToken}`);
      const ok = res.status === 401;
      recordTest('Security & CASL', 'Expired JWT token rejected with 401 Unauthorized', ok, !ok ? `Expected 401, got ${res.status}` : null);
    } catch (e) {
      recordTest('Security & CASL', 'Expired JWT token rejected with 401 Unauthorized', false, e.message);
    }

    // 8.3 Invalid Malformed Token -> 401
    try {
      const res = await request(BASE_URL)
        .get('/invoice')
        .set('Authorization', 'Bearer fake.invalid.jwt.token');
      const ok = res.status === 401;
      recordTest('Security & CASL', 'Malformed JWT token rejected with 401 Unauthorized', ok, !ok ? `Expected 401, got ${res.status}` : null);
    } catch (e) {
      recordTest('Security & CASL', 'Malformed JWT token rejected with 401 Unauthorized', false, e.message);
    }

    // 8.4 CASL Forbidden: Employee role blocked from Invoice creation -> 403
    try {
      const res = await request(BASE_URL)
        .post('/invoice')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          partyName: 'Unauthorized Corp',
          items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }],
        });
      const ok = res.status === 403;
      recordTest('Security & CASL', 'CASL Forbidden: Employee role blocked from creating Invoices (403)', ok, !ok ? `Expected 403, got ${res.status}` : null);
    } catch (e) {
      recordTest('Security & CASL', 'CASL Forbidden: Employee role blocked from creating Invoices (403)', false, e.message);
    }

    // 8.5 SQL Injection defense in search queries
    try {
      const res = await request(BASE_URL)
        .get("/quotation?search=' OR '1'='1' --")
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 200 && (Array.isArray(res.body) || Array.isArray(res.body.data));
      recordTest('Security & CASL', 'SQL Injection: Parameterized search sanitization', ok, !ok ? `Expected 200 with data array, got ${res.status}` : null);
    } catch (e) {
      recordTest('Security & CASL', 'SQL Injection: Parameterized search sanitization', false, e.message);
    }

    // 8.6 XSS defense in input payloads
    try {
      const res = await request(BASE_URL)
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Safe Corp',
          notes: '<script>alert("xss")</script>',
          items: [{ itemName: 'Safe Item', quantity: 1, unitPrice: 100 }],
        });
      const q = res.body.quotation || res.body;
      const qId = q.id;
      const ok = res.status === 201 && q.notes === '<script>alert("xss")</script>';
      if (qId) await pool.query('DELETE FROM "Quotation" WHERE id = $1', [qId]);
      recordTest('Security & CASL', 'XSS Injection: Payloads stored safely without execution', ok, !ok ? `Expected 201 with stored string, got ${res.status}` : null);
    } catch (e) {
      recordTest('Security & CASL', 'XSS Injection: Payloads stored safely without execution', false, e.message);
    }

    // 8.7 Non-existent UUID (IDOR)
    try {
      const res = await request(BASE_URL)
        .get('/quotation/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      const ok = res.status === 404;
      recordTest('Security & CASL', 'Non-existent UUID returns clean 404 Not Found', ok, !ok ? `Expected 404, got ${res.status}` : null);
    } catch (e) {
      recordTest('Security & CASL', 'Non-existent UUID returns clean 404 Not Found', false, e.message);
    }

  } finally {
    // Cleanup any lingering test records
    console.log('\n--- Cleaning up test records ---');
    if (testCreditNoteId) {
      await pool.query('DELETE FROM "CreditDebitNote" WHERE id = $1', [testCreditNoteId]).catch(() => {});
    }
    if (testDebitNoteId) {
      await pool.query('DELETE FROM "CreditDebitNote" WHERE id = $1', [testDebitNoteId]).catch(() => {});
    }
    if (testInvoiceId) {
      await pool.query('DELETE FROM "Invoice" WHERE id = $1', [testInvoiceId]).catch(() => {});
    }
    if (testPoId) {
      await pool.query('DELETE FROM "PurchaseOrder" WHERE id = $1', [testPoId]).catch(() => {});
    }
    if (testQuotationId) {
      await pool.query('DELETE FROM "Quotation" WHERE id = $1', [testQuotationId]).catch(() => {});
    }
    if (testChallanId) {
      await pool.query('DELETE FROM "DeliveryChallan" WHERE id = $1', [testChallanId]).catch(() => {});
    }
    await pool.end();
  }

  console.log('\n========================================================================');
  console.log('  TEST EXECUTION SUMMARY');
  console.log('========================================================================');
  console.log(`  Total Tests Executed: ${results.total}`);
  console.log(`  Passed:               ${results.passed}`);
  console.log(`  Failed:               ${results.failed}`);
  console.log('------------------------------------------------------------------------');
  for (const [mod, data] of Object.entries(results.modules)) {
    const status = data.failed === 0 ? 'PASS ✅' : 'FAIL ❌';
    console.log(`  ${mod.padEnd(20)}: ${data.passed}/${data.total} passed [${status}]`);
  }
  console.log('========================================================================\n');

  if (results.failed > 0) {
    console.error('FAILURES:');
    console.error(JSON.stringify(results.failures, null, 2));
    process.exit(1);
  } else {
    console.log('🎉 ALL PRODUCTION API & DATABASE INTEGRATION TESTS PASSED 100%!');
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('FATAL TEST RUNNER ERROR:', err);
  process.exit(1);
});
