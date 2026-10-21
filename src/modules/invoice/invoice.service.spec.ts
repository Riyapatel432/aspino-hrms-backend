import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';

describe('InvoiceService Unit Tests', () => {
  let service: InvoiceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrisma);
      }),
      invoice: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      invoiceItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      purchaseOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      quotation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bank: {
        findUnique: jest.fn(),
      },
      uom: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new InvoiceService(mockPrisma);
  });

  describe('generateNextNumber', () => {
    it('should generate INV-YYYY-0001 for SALES invoices', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextNumber('SALES');
      expect(num).toBe(`INV-${year}-0001`);
    });

    it('should generate PINV-YYYY-0001 for PURCHASE invoices', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextNumber('PURCHASE');
      expect(num).toBe(`PINV-${year}-0001`);
    });
  });

  describe('create invoice and GST calculations', () => {
    it('should reject when partyName is missing', async () => {
      await expect(
        service.create({
          partyName: '',
          items: [{ itemName: 'Cough Syrup 100ml', quantity: 50, unitPrice: 40 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when items list is empty', async () => {
      await expect(
        service.create({
          partyName: 'Remedy Life Sciences',
          items: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accurately split CGST and SGST for intra-state GST taxType', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-intra',
        ...args.data,
      }));

      // 100 qty @ 200 = 20,000 taxable. 18% GST -> 9% CGST (1,800), 9% SGST (1,800), 0 IGST.
      // Total Tax = 3,600. Round off = 0. Grand Total = 23,600.
      await service.create({
        partyName: 'Remedy Life Sciences',
        taxType: 'GST',
        taxPercentage: 18,
        items: [
          {
            itemName: 'Cough Syrup 100ml',
            quantity: 100,
            unitPrice: 200,
            taxPercent: 18,
          },
        ],
      } as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalled();
      const data = mockPrisma.invoice.create.mock.calls[0][0].data;
      expect(data.subTotal).toBe(20000);
      expect(data.cgstAmount).toBe(1800);
      expect(data.sgstAmount).toBe(1800);
      expect(data.igstAmount).toBe(0);
      expect(data.taxAmount).toBe(3600);
      expect(data.totalAmount).toBe(23600);
      expect(data.balanceAmount).toBe(23600);
    });

    it('should accurately calculate IGST for inter-state IGST taxType', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-inter',
        ...args.data,
      }));

      // 50 qty @ 100 = 5,000 taxable. 12% IGST -> CGST 0, SGST 0, IGST 600.
      await service.create({
        partyName: 'Delhi Central Distributors',
        taxType: 'IGST',
        taxPercentage: 12,
        items: [
          {
            itemName: 'Analgesic Gel 30g',
            quantity: 50,
            unitPrice: 100,
            taxPercent: 12,
          },
        ],
      } as any);

      const data = mockPrisma.invoice.create.mock.calls[0][0].data;
      expect(data.subTotal).toBe(5000);
      expect(data.cgstAmount).toBe(0);
      expect(data.sgstAmount).toBe(0);
      expect(data.igstAmount).toBe(600);
      expect(data.taxAmount).toBe(600);
      expect(data.totalAmount).toBe(5600);
    });

    it('should correctly handle partial paidAmount and compute balanceAmount', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-part',
        ...args.data,
      }));

      await service.create({
        partyName: 'Apollo Hospitals',
        taxType: 'GST',
        taxPercentage: 18,
        paidAmount: 5000,
        items: [{ itemName: 'Saline IV 500ml', quantity: 100, unitPrice: 100, taxPercent: 18 }],
      } as any);

      const data = mockPrisma.invoice.create.mock.calls[0][0].data;
      // Subtotal: 10000, Tax: 1800, Total: 11800, Paid: 5000 => Balance: 6800
      expect(data.totalAmount).toBe(11800);
      expect(data.paidAmount).toBe(5000);
      expect(data.balanceAmount).toBe(6800);
    });
  });

  describe('createFromPurchaseOrder', () => {
    it('should convert Purchase Order to Invoice with linked purchaseOrderId', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.findUnique.mockResolvedValue(null);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-100',
        poNumber: 'PO-2026-0010',
        partyName: 'National Bulk Drugs Ltd',
        partyEmail: 'sales@nbd.com',
        partyGstNo: '27AAACN1234A1Z1',
        billingAddress: 'Plant 1',
        shippingAddress: 'Plant 1',
        currency: 'INR',
        taxType: 'GST',
        items: [
          {
            productId: 'p-1',
            itemCode: 'PRD-RAW-01',
            itemName: 'Paracetamol IP Powder',
            hsnCode: '2922',
            uom: 'KGS',
            quantity: 500,
            unitPrice: 220,
            discountPercent: 0,
            taxPercent: 18,
            totalPrice: 129800,
          },
        ],
      });

      mockPrisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-from-po',
        ...args.data,
      }));

      const inv = await service.createFromPurchaseOrder('po-100', {
        type: 'PURCHASE',
      } as any);

      expect(inv.purchaseOrderId).toBe('po-100');
      expect(inv.partyName).toBe('National Bulk Drugs Ltd');
    });
  });
});
