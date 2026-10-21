import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreditDebitNoteService } from './credit-debit-note.service';
import { NoteTypeDto, NoteStatusDto } from './dto/create-credit-debit-note.dto';

describe('CreditDebitNoteService Unit Tests', () => {
  let service: CreditDebitNoteService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      creditDebitNote: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      creditDebitNoteItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      invoice: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      uom: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new CreditDebitNoteService(mockPrisma);
  });

  describe('generateNextNumber', () => {
    it('should generate CN-YYYY-0001 for Credit Note', async () => {
      mockPrisma.creditDebitNote.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextNumber(NoteTypeDto.CREDIT_NOTE);
      expect(num).toBe(`CN-${year}-0001`);
    });

    it('should generate DN-YYYY-0001 for Debit Note', async () => {
      mockPrisma.creditDebitNote.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextNumber(NoteTypeDto.DEBIT_NOTE);
      expect(num).toBe(`DN-${year}-0001`);
    });
  });

  describe('create and financial calculations', () => {
    it('should reject when partyName or reason is missing', async () => {
      await expect(
        service.create({
          type: NoteTypeDto.CREDIT_NOTE,
          partyName: '',
          reason: 'Return',
          items: [{ itemName: 'Capsule Item', quantity: 1, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          type: NoteTypeDto.CREDIT_NOTE,
          partyName: 'Customer X',
          reason: '',
          items: [{ itemName: 'Capsule Item', quantity: 1, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate noteNumber', async () => {
      mockPrisma.creditDebitNote.findUnique.mockResolvedValue({ id: 'existing-cn' });
      await expect(
        service.create({
          noteNumber: 'CN-2026-0001',
          type: NoteTypeDto.CREDIT_NOTE,
          partyName: 'Customer X',
          reason: 'Sales Return',
          items: [{ itemName: 'Capsule Item', quantity: 1, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate Credit Note return value and tax adjustment accurately', async () => {
      mockPrisma.creditDebitNote.findFirst.mockResolvedValue(null);
      mockPrisma.creditDebitNote.findUnique.mockResolvedValue(null);
      mockPrisma.creditDebitNote.create.mockImplementation((args: any) => ({
        id: 'cn-1',
        ...args.data,
      }));

      // Return 10 damaged units @ 50 = 500 taxable. 18% GST -> 45 CGST + 45 SGST = 90 tax.
      // Total Amount = 590.
      const cn = await service.create({
        type: NoteTypeDto.CREDIT_NOTE,
        partyName: 'Metro Healthcare',
        reason: 'Goods Damaged in Transit',
        taxType: 'GST',
        items: [
          {
            itemName: 'Eye Drops 10ml',
            quantity: 10,
            unitPrice: 50,
            taxPercent: 18,
          },
        ],
      } as any);

      expect(mockPrisma.creditDebitNote.create).toHaveBeenCalled();
      const data = mockPrisma.creditDebitNote.create.mock.calls[0][0].data;
      expect(data.partyName).toBe('Metro Healthcare');
      expect(data.subTotal).toBe(500);
      expect(data.cgstAmount).toBe(45);
      expect(data.sgstAmount).toBe(45);
      expect(data.taxAmount).toBe(90);
      expect(data.totalAmount).toBe(590);
    });
  });

  describe('createFromInvoice', () => {
    it('should create credit note referencing invoice and auto-populate party details', async () => {
      mockPrisma.creditDebitNote.findFirst.mockResolvedValue(null);
      mockPrisma.creditDebitNote.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-target',
        invoiceNumber: 'INV-2026-0099',
        invoiceDate: new Date('2026-10-01'),
        partyName: 'Apollo Pharmacy',
        partyEmail: 'billing@apollo.com',
        partyPhone: '9988776655',
        partyGstNo: '33AAACA0000A1Z5',
        billingAddress: 'Main St Chennai',
        shippingAddress: 'Main St Chennai',
        taxType: 'GST',
        items: [
          {
            productId: 'p-1',
            itemCode: 'PRD-1',
            itemName: 'Vitamin C 500mg',
            hsnCode: '3004',
            uom: 'STRIP',
            quantity: 20,
            unitPrice: 40,
            taxPercent: 12,
            totalPrice: 896,
          },
        ],
      });

      mockPrisma.creditDebitNote.create.mockImplementation((args: any) => ({
        id: 'cn-from-inv',
        ...args.data,
      }));

      const note = await service.createFromInvoice('inv-target', {
        type: NoteTypeDto.CREDIT_NOTE,
        reason: 'Expired stock return',
      });

      expect(note.invoiceId).toBe('inv-target');
      expect(note.invoiceNumber).toBe('INV-2026-0099');
      expect(note.partyName).toBe('Apollo Pharmacy');
    });
  });
});
