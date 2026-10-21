import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuotationService } from './quotation.service';

describe('QuotationService Unit Tests', () => {
  let service: QuotationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      quotation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      quotationItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      uom: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'uom-1', uomCode: 'KGS', uomName: 'Kilograms' },
          { id: 'uom-2', uomCode: 'NOS', uomName: 'Numbers' },
        ]),
      },
    };

    service = new QuotationService(mockPrisma);
  });

  describe('generateNextNumber', () => {
    it('should generate QTN-YYYY-0001 when no prior quotation exists', async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextNumber();
      expect(num).toBe(`QTN-${year}-0001`);
    });

    it('should increment existing sequence correctly', async () => {
      const year = new Date().getFullYear();
      mockPrisma.quotation.findFirst.mockResolvedValue({
        quotationNumber: `QTN-${year}-0042`,
      });
      const num = await service.generateNextNumber();
      expect(num).toBe(`QTN-${year}-0043`);
    });
  });

  describe('create quotation', () => {
    it('should reject when customerName is missing or empty', async () => {
      await expect(
        service.create({
          customerName: '',
          items: [{ itemName: 'Item A', quantity: 10, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when validUntil is earlier than quotationDate', async () => {
      await expect(
        service.create({
          customerName: 'Test Pharma Corp',
          quotationDate: new Date('2026-10-15'),
          validUntil: new Date('2026-10-10'),
          items: [{ itemName: 'Item A', quantity: 10, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when items list is empty', async () => {
      await expect(
        service.create({
          customerName: 'Test Pharma Corp',
          items: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when item quantity is zero or negative', async () => {
      await expect(
        service.create({
          customerName: 'Test Pharma Corp',
          items: [{ itemName: 'Item A', quantity: 0, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          customerName: 'Test Pharma Corp',
          items: [{ itemName: 'Item A', quantity: -5, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when item unit price is negative', async () => {
      await expect(
        service.create({
          customerName: 'Test Pharma Corp',
          items: [{ itemName: 'Item A', quantity: 5, unitPrice: -50 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate quotationNumber', async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({ id: 'existing-id' });
      await expect(
        service.create({
          quotationNumber: 'QTN-2026-9999',
          customerName: 'Test Pharma Corp',
          items: [{ itemName: 'Item A', quantity: 5, unitPrice: 50 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate financial totals accurately and create quotation', async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue(null);
      mockPrisma.quotation.findUnique.mockResolvedValue(null);
      mockPrisma.quotation.create.mockImplementation((args: any) => ({
        id: 'quot-1',
        ...args.data,
      }));

      // Item 1: 10 qty * 100 rate = 1000 base, 10% disc = 900 taxable, 18% tax = 162 => 1062
      // Item 2: 5 qty * 200 rate = 1000 base, 0% disc = 1000 taxable, 12% tax = 120 => 1120
      // SubTotal = 900 + 1000 = 1900
      // Header Discount: 5% of 1900 = 95 => 1805
      // Header Tax: 10% of 1805 = 180.5
      // Shipping: 50
      // Total Amount = 1805 + 180.5 + 50 = 2035.5
      await service.create({
        customerName: 'Global Biopharma Inc',
        discountPercentage: 5,
        taxPercentage: 10,
        shippingCharges: 50,
        items: [
          { itemName: 'Active API 500mg', quantity: 10, unitPrice: 100, discountPercent: 10, taxPercent: 18 },
          { itemName: 'Excipient Binder', quantity: 5, unitPrice: 200, discountPercent: 0, taxPercent: 12 },
        ],
      } as any);

      expect(mockPrisma.quotation.create).toHaveBeenCalled();
      const callData = mockPrisma.quotation.create.mock.calls[0][0].data;
      expect(callData.customerName).toBe('Global Biopharma Inc');
      expect(callData.subTotal).toBe(1900);
      expect(callData.discountAmount).toBe(95);
      expect(callData.taxAmount).toBe(180.5);
      expect(callData.shippingCharges).toBe(50);
      expect(callData.totalAmount).toBe(2035.5);
    });
  });

  describe('findOne and update', () => {
    it('should throw NotFoundException if quotation does not exist', async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should change status successfully', async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({ id: 'quot-1', status: 'DRAFT', isActive: true });
      mockPrisma.quotation.update.mockResolvedValue({ id: 'quot-1', status: 'SENT', isActive: true });

      const res = await service.changeStatus('quot-1', 'SENT' as any);
      expect(res.quotation.status).toBe('SENT');
      expect(mockPrisma.quotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quot-1' },
          data: { status: 'SENT' },
        }),
      );
    });

    it('should duplicate a quotation correctly with new sequential number', async () => {
      const year = new Date().getFullYear();
      mockPrisma.quotation.findUnique.mockResolvedValue({
        id: 'quot-orig',
        quotationNumber: `QTN-${year}-0001`,
        customerName: 'Global Biopharma Inc',
        status: 'ACCEPTED',
        subTotal: 1000,
        totalAmount: 1180,
        items: [{ itemName: 'API Item', quantity: 2, unitPrice: 500, totalPrice: 1000 }],
      });
      mockPrisma.quotation.findFirst.mockResolvedValue({
        quotationNumber: `QTN-${year}-0001`,
      });
      mockPrisma.quotation.create.mockImplementation((args: any) => ({
        id: 'quot-dup',
        ...args.data,
      }));

      const dup = await service.duplicate('quot-orig');
      expect(dup.quotation.quotationNumber).toBe(`QTN-${year}-0002`);
      expect(dup.quotation.status).toBe('DRAFT');
    });
  });
});
