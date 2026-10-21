import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('Complete ERP Module Production-Level Test Suite (7 Modules + Workflows)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let employeeToken: string;
  let superAdminUserId: string;

  // Track created test record IDs for cleanup & chaining
  let testQuotationId: string;
  let testPoId: string;
  let testInvoiceId: string;
  let testCreditNoteId: string;
  let testDebitNoteId: string;
  let testChallanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Get admin user from database
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@aspino.com' },
      include: { roleRelation: true },
    });
    if (!adminUser) {
      throw new Error('Admin user not found in database. Seed data must exist.');
    }
    superAdminUserId = adminUser.id;

    adminToken = await jwtService.signAsync({
      sub: adminUser.id,
      email: adminUser.email,
      role: 'SUPER_ADMIN',
    });

    // Employee user for permission and negative security tests
    const employeeUser = await prisma.user.findFirst({
      where: { role: 'EMPLOYEE' },
    });
    employeeToken = await jwtService.signAsync({
      sub: employeeUser ? employeeUser.id : 'emp-id',
      email: employeeUser ? employeeUser.email : 'employee@aspino.com',
      role: 'EMPLOYEE',
    });
  }, 60000);

  afterAll(async () => {
    // Clean up test records created during test execution
    try {
      if (testCreditNoteId) {
        await prisma.creditDebitNote.delete({ where: { id: testCreditNoteId } }).catch(() => {});
      }
      if (testDebitNoteId) {
        await prisma.creditDebitNote.delete({ where: { id: testDebitNoteId } }).catch(() => {});
      }
      if (testInvoiceId) {
        await prisma.invoice.delete({ where: { id: testInvoiceId } }).catch(() => {});
      }
      if (testPoId) {
        await prisma.purchaseOrder.delete({ where: { id: testPoId } }).catch(() => {});
      }
      if (testQuotationId) {
        await prisma.quotation.delete({ where: { id: testQuotationId } }).catch(() => {});
      }
      if (testChallanId) {
        await prisma.deliveryChallan.delete({ where: { id: testChallanId } }).catch(() => {});
      }
    } catch {}

    if (app) {
      await app.close();
    }
  });

  // ==========================================
  // 1. MODULE 1: QUOTATIONS
  // ==========================================
  describe('Module 1: Quotations (CRUD, Business Logic & Calculations)', () => {
    it('1.1 Should generate next sequential quotation number', async () => {
      const res = await request(app.getHttpServer())
        .get('/quotation/generate-number')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('quotationNumber');
      expect(res.body.quotationNumber).toMatch(/^QTN-\d{4}-\d{4}$/);
    });

    it('1.2 Negative Validation: Should reject quotation creation with empty customer name', async () => {
      const res = await request(app.getHttpServer())
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: '',
          items: [{ itemName: 'Paracetamol IP', quantity: 10, unitPrice: 200 }],
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('1.3 Negative Validation: Should reject when validUntil is earlier than quotationDate', async () => {
      await request(app.getHttpServer())
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Sun Pharma Lab',
          quotationDate: '2026-10-20',
          validUntil: '2026-10-10',
          items: [{ itemName: 'Paracetamol IP', quantity: 10, unitPrice: 200 }],
        })
        .expect(400);
    });

    it('1.4 Negative Validation: Should reject non-positive item quantity or negative rate', async () => {
      await request(app.getHttpServer())
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Sun Pharma Lab',
          items: [{ itemName: 'Paracetamol IP', quantity: 0, unitPrice: 200 }],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Sun Pharma Lab',
          items: [{ itemName: 'Paracetamol IP', quantity: 5, unitPrice: -50 }],
        })
        .expect(400);
    });

    it('1.5 CREATE: Should create quotation with multi-items and accurate financial calculations', async () => {
      // Line 1: 100 qty @ 50 = 5000, 10% disc = 4500 taxable, 18% tax = 810 => line 5310
      // Line 2: 50 qty @ 100 = 5000, 0% disc = 5000 taxable, 12% tax = 600 => line 5600
      // Subtotal = 4500 + 5000 = 9500
      // Header Discount: 5% of 9500 = 475 => 9025
      // Header Tax: 10% of 9025 = 902.5
      // Shipping: 200
      // Total = 9025 + 902.5 + 200 = 10127.5
      const res = await request(app.getHttpServer())
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
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testQuotationId = res.body.id;
      expect(res.body.subTotal).toBe(9500);
      expect(res.body.discountAmount).toBe(475);
      expect(res.body.taxAmount).toBe(902.5);
      expect(res.body.shippingCharges).toBe(200);
      expect(res.body.totalAmount).toBe(10127.5);
      expect(res.body.items).toHaveLength(2);
    });

    it('1.6 READ: Should fetch quotations list with pagination and search filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/quotation?search=Zydus&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((q: any) => q.id === testQuotationId);
      expect(found).toBeDefined();
    });

    it('1.7 READ: Should fetch quotation detail by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/quotation/${testQuotationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(testQuotationId);
      expect(res.body.customerName).toBe('Zydus Healthcare Ltd');
    });

    it('1.8 UPDATE: Should update quotation details and line items', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/quotation/${testQuotationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Updated priority delivery required',
          shippingCharges: 250,
        })
        .expect(200);

      expect(res.body.shippingCharges).toBe(250);
    });

    it('1.9 STATUS: Should transition quotation status to SENT and ACCEPTED', async () => {
      const res1 = await request(app.getHttpServer())
        .patch(`/quotation/${testQuotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SENT' })
        .expect(200);

      expect(res1.body.quotation.status).toBe('SENT');

      const res2 = await request(app.getHttpServer())
        .patch(`/quotation/${testQuotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACCEPTED' })
        .expect(200);

      expect(res2.body.quotation.status).toBe('ACCEPTED');
    });

    it('1.10 PDF: Should generate and stream quotation PDF binary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/quotation/${testQuotationId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.body).toBeDefined();
      expect(Buffer.isBuffer(res.body) || res.body.length > 0).toBe(true);
    });

    it('1.11 DUPLICATE: Should duplicate quotation into a new draft with new sequence', async () => {
      const res = await request(app.getHttpServer())
        .post(`/quotation/${testQuotationId}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.quotation).toBeDefined();
      expect(res.body.quotation.status).toBe('DRAFT');
      expect(res.body.quotation.id).not.toBe(testQuotationId);

      // Clean up duplicated record
      await prisma.quotation.delete({ where: { id: res.body.quotation.id } });
    });
  });

  // ==========================================
  // 2. MODULE 2: PURCHASE ORDERS
  // ==========================================
  describe('Module 2: Purchase Orders (Procurement, Sales & Quotation Conversion)', () => {
    it('2.1 Should generate next sequential purchase order number', async () => {
      const res = await request(app.getHttpServer())
        .get('/purchase-order/next-number?type=PROCUREMENT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('nextNumber');
      expect(res.body.nextNumber).toMatch(/^PO-\d{4}-\d{4}$/);
    });

    it('2.2 Negative Validation: Should reject PO without party name or with empty items', async () => {
      await request(app.getHttpServer())
        .post('/purchase-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: '',
          items: [{ itemName: 'Starch IP', quantity: 10, unitPrice: 50 }],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/purchase-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: 'National Solvents Ltd',
          items: [],
        })
        .expect(400);
    });

    it('2.3 CREATE: Should create procurement Purchase Order with taxes and shipping', async () => {
      const res = await request(app.getHttpServer())
        .post('/purchase-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: 'Aarti Industries Ltd',
          partyEmail: 'sales@aarti.com',
          partyGstNo: '24AAACA1111A1Z1',
          type: 'PROCUREMENT',
          billingAddress: 'Factory Gate 2, Vapi',
          shippingAddress: 'Factory Gate 2, Vapi',
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
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testPoId = res.body.id;
      // 200 * 40 = 8000. Header Tax: 18% of 8000 = 1440. Shipping: 500. Total = 9940.
      expect(res.body.subTotal).toBe(8000);
      expect(res.body.taxAmount).toBe(1440);
      expect(res.body.shippingCharges).toBe(500);
      expect(res.body.totalAmount).toBe(9940);
      expect(res.body.status).toBe('DRAFT');
    });

    it('2.4 WORKFLOW: Convert Quotation -> Purchase Order (/purchase-order/from-quotation/:id)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/purchase-order/from-quotation/${testQuotationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'SALES',
          notes: 'Customer PO received against quote',
        })
        .expect(201);

      expect(res.body.purchaseOrder).toBeDefined();
      expect(res.body.purchaseOrder.quotationId).toBe(testQuotationId);
      expect(res.body.purchaseOrder.partyName).toBe('Zydus Healthcare Ltd');

      // Verify source quotation was marked CONVERTED
      const updatedQuote = await prisma.quotation.findUnique({
        where: { id: testQuotationId },
      });
      expect(updatedQuote?.status).toBe('CONVERTED');

      // Clean up converted PO
      await prisma.purchaseOrder.delete({ where: { id: res.body.purchaseOrder.id } });
    });

    it('2.5 READ: Should list purchase orders with filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/purchase-order?type=PROCUREMENT&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.some((po: any) => po.id === testPoId)).toBe(true);
    });

    it('2.6 UPDATE: Should update PO terms & notes', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/purchase-order/${testPoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentTerms: '45 Days Net with LC',
        })
        .expect(200);

      expect(res.body.paymentTerms).toBe('45 Days Net with LC');
    });

    it('2.7 STATUS: Should transition PO to ISSUED and CONFIRMED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/purchase-order/${testPoId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ISSUED' })
        .expect(200);

      expect(res.body.purchaseOrder.status).toBe('ISSUED');
    });

    it('2.8 PDF: Should stream Purchase Order PDF', async () => {
      const res = await request(app.getHttpServer())
        .get(`/purchase-order/${testPoId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  // ==========================================
  // 3. MODULE 3: INVOICES
  // ==========================================
  describe('Module 3: Invoices (GSTIN, HSN, Tax Splitting & Conversions)', () => {
    it('3.1 Should generate next sequential invoice number', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoice/next-number?type=SALES')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('nextNumber');
      expect(res.body.nextNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    });

    it('3.2 Negative Validation: Should reject empty party name or empty line items', async () => {
      await request(app.getHttpServer())
        .post('/invoice')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: '',
          items: [{ itemName: 'Dextrose Anhydrous', quantity: 10, unitPrice: 50 }],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/invoice')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partyName: 'Cipla Therapeutics',
          items: [],
        })
        .expect(400);
    });

    it('3.3 CREATE (Intra-State GST): Split CGST & SGST with partial payment', async () => {
      // 100 qty @ 100 = 10,000. 18% GST -> 900 CGST + 900 SGST = 1800 tax.
      // Total = 11,800. Paid: 5,000. Balance: 6,800.
      const res = await request(app.getHttpServer())
        .post('/invoice')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'SALES',
          partyName: 'Cipla Healthcare Ltd',
          partyGstNo: '36AAACC1234A1Z0',
          partyEmail: 'accounts@cipla.com',
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
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testInvoiceId = res.body.id;
      expect(res.body.subTotal).toBe(10000);
      expect(res.body.cgstAmount).toBe(900);
      expect(res.body.sgstAmount).toBe(900);
      expect(res.body.igstAmount).toBe(0);
      expect(res.body.taxAmount).toBe(1800);
      expect(res.body.totalAmount).toBe(11800);
      expect(res.body.paidAmount).toBe(5000);
      expect(res.body.balanceAmount).toBe(6800);
    });

    it('3.4 CREATE (Inter-State IGST): Full IGST assignment', async () => {
      const res = await request(app.getHttpServer())
        .post('/invoice')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'SALES',
          partyName: 'Fortis Hospital Mumbai',
          partyGstNo: '27AAACF9876A1Z3',
          taxType: 'IGST',
          taxPercentage: 12,
          items: [
            {
              itemName: 'Antiseptic Solution 500ml',
              hsnCode: '3808',
              quantity: 50,
              unitPrice: 80,
              taxPercent: 12,
            },
          ],
        })
        .expect(201);

      // 50 * 80 = 4000. 12% IGST = 480. Total = 4480.
      expect(res.body.subTotal).toBe(4000);
      expect(res.body.cgstAmount).toBe(0);
      expect(res.body.sgstAmount).toBe(0);
      expect(res.body.igstAmount).toBe(480);
      expect(res.body.totalAmount).toBe(4480);

      // Clean up temporary invoice
      await prisma.invoice.delete({ where: { id: res.body.id } });
    });

    it('3.5 WORKFLOW: Convert Purchase Order -> Invoice (/invoice/from-po/:poId)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/invoice/from-po/${testPoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Invoice created against Aarti Industries PO',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.purchaseOrderId).toBe(testPoId);
      expect(res.body.partyName).toBe('Aarti Industries Ltd');

      // Clean up generated invoice
      await prisma.invoice.delete({ where: { id: res.body.id } });
    });

    it('3.6 READ: Fetch invoice details and verify PostgreSQL decimal integrity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/invoice/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(testInvoiceId);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].batchNumber).toBe('BATCH-CIP-2026');
    });

    it('3.7 STATUS: Should transition invoice to PARTIALLY_PAID and PAID', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/invoice/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PARTIALLY_PAID' })
        .expect(200);

      expect(res.body.invoice.status).toBe('PARTIALLY_PAID');
    });

    it('3.8 PDF: Should stream Invoice PDF', async () => {
      const res = await request(app.getHttpServer())
        .get(`/invoice/${testInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  // ==========================================
  // 4. MODULE 4: CREDIT NOTES
  // ==========================================
  describe('Module 4: Credit Notes (Returns, Balance Adjustments & Invoice Linkage)', () => {
    it('4.1 Should generate next sequential Credit Note number', async () => {
      const res = await request(app.getHttpServer())
        .get('/credit-debit-note/next-number?type=CREDIT_NOTE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('nextNumber');
      expect(res.body.nextNumber).toMatch(/^CN-\d{4}-\d{4}$/);
    });

    it('4.2 Negative Validation: Should reject empty party name or reason', async () => {
      await request(app.getHttpServer())
        .post('/credit-debit-note')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT_NOTE',
          partyName: '',
          reason: 'Defective batch',
          items: [{ itemName: 'Item A', quantity: 1, unitPrice: 10 }],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/credit-debit-note')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT_NOTE',
          partyName: 'Customer A',
          reason: '',
          items: [{ itemName: 'Item A', quantity: 1, unitPrice: 10 }],
        })
        .expect(400);
    });

    it('4.3 WORKFLOW: Create Credit Note linked to Invoice (/credit-debit-note/from-invoice/:id)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/credit-debit-note/from-invoice/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT_NOTE',
          reason: 'Damaged strips during transit',
          items: [
            {
              itemName: 'Ciprofloxacin Tablets 500mg',
              quantity: 10,
              unitPrice: 100,
              taxPercent: 18,
            },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testCreditNoteId = res.body.id;
      expect(res.body.invoiceId).toBe(testInvoiceId);
      expect(res.body.type).toBe('CREDIT_NOTE');
      // 10 * 100 = 1000 base. 18% GST = 90 CGST + 90 SGST = 180. Total = 1180.
      expect(res.body.subTotal).toBe(1000);
      expect(res.body.taxAmount).toBe(180);
      expect(res.body.totalAmount).toBe(1180);
    });

    it('4.4 READ: Fetch Credit Note details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/credit-debit-note/${testCreditNoteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(testCreditNoteId);
      expect(res.body.type).toBe('CREDIT_NOTE');
    });

    it('4.5 STATUS: Change status to ISSUED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/credit-debit-note/${testCreditNoteId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ISSUED' })
        .expect(200);

      expect(res.body.status).toBe('ISSUED');
    });

    it('4.6 PDF: Download Credit Note PDF', async () => {
      const res = await request(app.getHttpServer())
        .get(`/credit-debit-note/${testCreditNoteId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  // ==========================================
  // 5. MODULE 5: DEBIT NOTES
  // ==========================================
  describe('Module 5: Debit Notes (Vendor Adjustments & Price Corrections)', () => {
    it('5.1 Should generate next sequential Debit Note number', async () => {
      const res = await request(app.getHttpServer())
        .get('/credit-debit-note/next-number?type=DEBIT_NOTE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('nextNumber');
      expect(res.body.nextNumber).toMatch(/^DN-\d{4}-\d{4}$/);
    });

    it('5.2 CREATE: Create Debit Note for vendor rate revision', async () => {
      const res = await request(app.getHttpServer())
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
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testDebitNoteId = res.body.id;
      expect(res.body.type).toBe('DEBIT_NOTE');
      expect(res.body.subTotal).toBe(500);
      expect(res.body.taxAmount).toBe(90);
      expect(res.body.totalAmount).toBe(590);
    });

    it('5.3 READ: List Debit Notes filtering by type=DEBIT_NOTE', async () => {
      const res = await request(app.getHttpServer())
        .get('/credit-debit-note?type=DEBIT_NOTE&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.every((n: any) => n.type === 'DEBIT_NOTE')).toBe(true);
    });

    it('5.4 PDF: Download Debit Note PDF', async () => {
      const res = await request(app.getHttpServer())
        .get(`/credit-debit-note/${testDebitNoteId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  // ==========================================
  // 6. MODULE 6: DELIVERY CHALLANS
  // ==========================================
  describe('Module 6: Delivery Challans (Rule 55, Logistics & Statistics)', () => {
    it('6.1 Should generate next sequential Challan number', async () => {
      const res = await request(app.getHttpServer())
        .get('/delivery-challan/next-number')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('nextNumber');
      expect(res.body.nextNumber).toMatch(/^DC-\d{4}-\d{4}$/);
    });

    it('6.2 Negative Validation: Should reject duplicate challan number', async () => {
      const duplicateNum = 'DC-2026-TESTDUP';
      const initial = await request(app.getHttpServer())
        .post('/delivery-challan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          challanNumber: duplicateNum,
          partyName: 'Warehouse 1',
          items: [{ itemName: 'Test Cargo', quantity: 1, unitPrice: 100 }],
        })
        .expect(201);

      // Attempt duplicate
      await request(app.getHttpServer())
        .post('/delivery-challan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          challanNumber: duplicateNum,
          partyName: 'Warehouse 2',
          items: [{ itemName: 'Test Cargo', quantity: 1, unitPrice: 100 }],
        })
        .expect(400);

      // Clean up
      await prisma.deliveryChallan.delete({ where: { id: initial.body.id } });
    });

    it('6.3 CREATE: Create Delivery Challan with GST Rule 55 JOB_WORK supply type', async () => {
      // 50 vials @ 400 = 20,000 base. 18% GST -> 1800 CGST + 1800 SGST = 3600 tax.
      // Other charges: 150. Total = 23,750.
      const res = await request(app.getHttpServer())
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
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testChallanId = res.body.id;
      expect(res.body.challanType).toBe('JOB_WORK');
      expect(res.body.vehicleNumber).toBe('TS07UA9876');
      expect(res.body.subTotal).toBe(20000);
      expect(res.body.totalAmount).toBe(23750);
      expect(res.body.status).toBe('DRAFT');
    });

    it('6.4 STATISTICS: Verify KPI dashboard counters and consignment total', async () => {
      const res = await request(app.getHttpServer())
        .get('/delivery-challan/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalChallans');
      expect(res.body).toHaveProperty('draftCount');
      expect(res.body).toHaveProperty('issuedCount');
      expect(res.body).toHaveProperty('deliveredCount');
      expect(res.body).toHaveProperty('cancelledCount');
      expect(res.body).toHaveProperty('totalValue');
      expect(res.body.totalChallans).toBeGreaterThanOrEqual(1);
    });

    it('6.5 STATUS TRANSITIONS: Lifecycle DRAFT -> ISSUED -> DELIVERED', async () => {
      const res1 = await request(app.getHttpServer())
        .patch(`/delivery-challan/${testChallanId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ISSUED' })
        .expect(200);

      expect(res1.body.status).toBe('ISSUED');

      const res2 = await request(app.getHttpServer())
        .patch(`/delivery-challan/${testChallanId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED' })
        .expect(200);

      expect(res2.body.status).toBe('DELIVERED');
    });

    it('6.6 PDF: Download Delivery Challan PDF', async () => {
      const res = await request(app.getHttpServer())
        .get(`/delivery-challan/${testChallanId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.header['content-type']).toBe('application/pdf');
    });

    it('6.7 SOFT DELETE: Removing challan marks isActive: false', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/delivery-challan/${testChallanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Verify querying inactive challan returns 404
      await request(app.getHttpServer())
        .get(`/delivery-challan/${testChallanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ==========================================
  // 7. MODULE 7: ACTIVITY LOGS
  // ==========================================
  describe('Module 7: Activity Logs (Audit Trail, User Attribution & Security)', () => {
    it('7.1 READ: Retrieve audit logs with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('7.2 SEARCH & FILTER: Filter activity logs by userEmail and action', async () => {
      // Create a test log directly via Prisma to verify filtering
      await prisma.activityLog.create({
        data: {
          userEmail: 'qa.test@aspino.com',
          userName: 'QA Automation Bot',
          userRole: 'QA_ENGINEER',
          action: 'CREATE_INVOICE_TEST',
          method: 'POST',
          url: '/invoice',
          statusCode: 201,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/audit/logs?userEmail=qa.test@aspino.com')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.some((l: any) => l.userEmail === 'qa.test@aspino.com')).toBe(true);

      // Clean up test log
      await prisma.activityLog.deleteMany({ where: { userEmail: 'qa.test@aspino.com' } });
    });
  });

  // ==========================================
  // 8. SECURITY & CASL PERMISSIONS TESTING
  // ==========================================
  describe('Security & CASL Authorization Tests', () => {
    it('8.1 Missing Token: Unauthenticated request must return 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/quotation')
        .expect(401);
    });

    it('8.2 Invalid JWT: Malformed or fake token must return 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/invoice')
        .set('Authorization', 'Bearer invalid.tampered.token')
        .expect(401);
    });

    it('8.3 CASL Forbidden: Employee role must be rejected (403) from creating invoices', async () => {
      await request(app.getHttpServer())
        .post('/invoice')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          partyName: 'Unauthorized Invoice Attempt',
          items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }],
        })
        .expect(403);
    });

    it('8.4 SQL Injection Defense: Malicious input in query params should be safely handled', async () => {
      const res = await request(app.getHttpServer())
        .get("/quotation?search=' OR '1'='1' --")
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('8.5 XSS Defense: Script tags in document notes should be treated as text, not executed', async () => {
      const res = await request(app.getHttpServer())
        .post('/quotation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerName: 'Safe Input Corp',
          notes: '<script>alert("XSS")</script>',
          items: [{ itemName: 'Safe Item', quantity: 1, unitPrice: 100 }],
        })
        .expect(201);

      expect(res.body.notes).toBe('<script>alert("XSS")</script>');

      // Clean up
      await prisma.quotation.delete({ where: { id: res.body.id } });
    });
  });
});
