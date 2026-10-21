import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';

describe('PurchaseOrderService Unit Tests', () => {
  let service: PurchaseOrderService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      purchaseOrder: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 'po-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      purchaseOrderItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      quotation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      supplier: {
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn(),
      },
      uom: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new PurchaseOrderService(mockPrisma);
  });

  describe('generateNextNumber', () => {
    it('should generate PO-YYYY-0001 for PROCUREMENT', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextNumber('PROCUREMENT');
      expect(num).toBe(`PO-${year}-0001`);
    });

    it('should generate SPO-YYYY-0001 for SALES', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextNumber('SALES');
      expect(num).toBe(`SPO-${year}-0001`);
    });
  });

  describe('create purchase order', () => {
    it('should reject when partyName is missing or empty', async () => {
      await expect(
        service.create({
          partyName: '',
          items: [{ itemName: 'Solvent Acetone', quantity: 10, unitPrice: 80 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when items list is empty', async () => {
      await expect(
        service.create({
          partyName: 'Apex Chemical Suppliers',
          items: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-positive item quantity or negative unit price', async () => {
      await expect(
        service.create({
          partyName: 'Apex Chemical Suppliers',
          items: [{ itemName: 'Item X', quantity: 0, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          partyName: 'Apex Chemical Suppliers',
          items: [{ itemName: 'Item X', quantity: 5, unitPrice: -10 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate poNumber', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'existing-po' });
      await expect(
        service.create({
          poNumber: 'PO-2026-9999',
          partyName: 'Apex Chemical Suppliers',
          items: [{ itemName: 'Item X', quantity: 5, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate totals accurately and create purchase order', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(null);
      mockPrisma.purchaseOrder.create.mockImplementation((args: any) => ({
        id: 'po-1',
        ...args.data,
      }));

      // Item 1: 20 qty * 50 = 1000 base, 0% disc = 1000, 18% tax = 180 => 1180
      // Header Discount: 0%, Header Tax: 18% of 1000 = 180, Shipping: 100 => 1280
      await service.create({
        partyName: 'Apex Chemical Suppliers',
        taxPercentage: 18,
        shippingCharges: 100,
        items: [{ itemName: 'Solvent Acetone', quantity: 20, unitPrice: 50, taxPercent: 18 }],
      } as any);

      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalled();
      const callData = mockPrisma.purchaseOrder.create.mock.calls[0][0].data;
      expect(callData.partyName).toBe('Apex Chemical Suppliers');
      expect(callData.subTotal).toBe(1000);
      expect(callData.taxAmount).toBe(180);
      expect(callData.shippingCharges).toBe(100);
      expect(callData.totalAmount).toBe(1280);
    });
  });

  describe('createFromQuotation', () => {
    it('should convert an existing quotation to purchase order and update quotation status to CONVERTED', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(null);
      mockPrisma.quotation.findUnique.mockResolvedValue({
        id: 'quot-100',
        quotationNumber: 'QTN-2026-0005',
        customerId: 'cust-1',
        customerName: 'Astra Biotech Ltd',
        customerEmail: 'astra@biotech.com',
        customerPhone: '9876543210',
        billingAddress: 'Unit 4 Pharma City',
        shippingAddress: 'Unit 4 Pharma City',
        gstNo: '24AAACA0000A1Z5',
        currency: 'INR',
        taxType: 'GST',
        items: [
          {
            productId: 'prod-1',
            itemCode: 'PRD-001',
            itemName: 'Aspirin Powder USP',
            description: 'Pharma Grade 99.9%',
            hsnCode: '2936',
            uom: 'KGS',
            quantity: 100,
            unitPrice: 350,
            discountPercent: 5,
            taxPercent: 18,
            totalPrice: 39235,
          },
        ],
      });

      mockPrisma.purchaseOrder.create.mockImplementation((args: any) => ({
        id: 'po-from-quot',
        ...args.data,
      }));

      const res = await service.createFromQuotation('quot-100', {
        type: 'SALES',
        notes: 'Converted from Approved Quote QTN-2026-0005',
      } as any);

      expect(mockPrisma.quotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quot-100' },
          data: expect.objectContaining({ status: 'CONVERTED' }),
        }),
      );
      expect(res.purchaseOrder.quotationId).toBe('quot-100');
      expect(res.purchaseOrder.partyName).toBe('Astra Biotech Ltd');
    });
  });

  describe('status transitions and delete', () => {
    it('should update status to ISSUED', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'po-1', status: 'DRAFT' });
      mockPrisma.purchaseOrder.update.mockResolvedValue({ id: 'po-1', status: 'ISSUED' });

      const updated = await service.changeStatus('po-1', 'ISSUED' as any);
      expect(updated.purchaseOrder.status).toBe('ISSUED');
    });

    it('should delete a draft purchase order', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'po-1', status: 'DRAFT' });
      mockPrisma.purchaseOrder.delete.mockResolvedValue({ id: 'po-1' });

      const res = await service.delete('po-1');
      expect(res.message).toContain('deleted successfully');
      expect(mockPrisma.purchaseOrder.delete).toHaveBeenCalledWith({
        where: { id: 'po-1' },
      });
    });
  });
});
