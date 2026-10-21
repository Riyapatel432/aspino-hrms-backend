import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryChallanService } from './delivery-challan.service';
import { ChallanStatus, ChallanType } from '@prisma/client';

describe('DeliveryChallanService Unit Tests', () => {
  let service: DeliveryChallanService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      deliveryChallan: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }),
      },
      deliveryChallanItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    service = new DeliveryChallanService(mockPrisma);
  });

  describe('generateNextChallanNumber', () => {
    it('should generate DC-YYYY-0001 when no challan exists', async () => {
      mockPrisma.deliveryChallan.findFirst.mockResolvedValue(null);
      const year = new Date().getFullYear();
      const num = await service.generateNextChallanNumber();
      expect(num).toBe(`DC-${year}-0001`);
    });

    it('should increment sequence when existing challan is found', async () => {
      const year = new Date().getFullYear();
      mockPrisma.deliveryChallan.findFirst.mockResolvedValue({
        challanNumber: `DC-${year}-0015`,
      });
      const num = await service.generateNextChallanNumber();
      expect(num).toBe(`DC-${year}-0016`);
    });
  });

  describe('create delivery challan and calculations', () => {
    it('should reject duplicate challanNumber', async () => {
      mockPrisma.deliveryChallan.findUnique.mockResolvedValue({ id: 'existing-dc' });
      await expect(
        service.create({
          challanNumber: 'DC-2026-0001',
          partyName: 'XYZ Transporters',
          items: [{ itemName: 'Carton Box', quantity: 1, unitPrice: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create delivery challan with Rule 55 supply types and accurate totals', async () => {
      mockPrisma.deliveryChallan.findFirst.mockResolvedValue(null);
      mockPrisma.deliveryChallan.findUnique.mockResolvedValue(null);
      mockPrisma.deliveryChallan.create.mockImplementation((args: any) => ({
        id: 'dc-1',
        ...args.data,
      }));

      // 50 qty @ 200 = 10,000 base. 18% GST -> 900 CGST + 900 SGST = 1,800 tax. Total = 11,800.
      await service.create({
        partyName: 'BioPharm Finished Goods Warehouse',
        challanType: ChallanType.JOB_WORK,
        transportMode: 'Road',
        vehicleNumber: 'GJ01AB1234',
        transporterName: 'VRL Logistics',
        eWayBillNumber: '101234567890',
        taxType: 'GST',
        items: [
          {
            itemName: 'Sterile Vials 5ml',
            quantity: 50,
            unitPrice: 200,
            taxPercent: 18,
          },
        ],
      } as any);

      expect(mockPrisma.deliveryChallan.create).toHaveBeenCalled();
      const data = mockPrisma.deliveryChallan.create.mock.calls[0][0].data;
      expect(data.partyName).toBe('BioPharm Finished Goods Warehouse');
      expect(data.challanType).toBe(ChallanType.JOB_WORK);
      expect(data.vehicleNumber).toBe('GJ01AB1234');
      expect(data.subTotal).toBe(10000);
      expect(data.cgstAmount).toBe(900);
      expect(data.sgstAmount).toBe(900);
      expect(data.totalAmount).toBe(11800);
    });
  });

  describe('getStatistics', () => {
    it('should aggregate total, drafts, issued, delivered, cancelled, and consignment value', async () => {
      mockPrisma.deliveryChallan.count
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(5)  // draft
        .mockResolvedValueOnce(10) // issued
        .mockResolvedValueOnce(8)  // delivered
        .mockResolvedValueOnce(2); // cancelled

      mockPrisma.deliveryChallan.aggregate.mockResolvedValue({
        _sum: { totalAmount: 450000 },
      });

      const stats = await service.getStatistics();
      expect(stats.totalChallans).toBe(25);
      expect(stats.draftCount).toBe(5);
      expect(stats.issuedCount).toBe(10);
      expect(stats.deliveredCount).toBe(8);
      expect(stats.cancelledCount).toBe(2);
      expect(stats.totalValue).toBe(450000);
    });
  });

  describe('status transitions and soft delete', () => {
    it('should transition status to DELIVERED', async () => {
      mockPrisma.deliveryChallan.findUnique.mockResolvedValue({
        id: 'dc-1',
        isActive: true,
        status: ChallanStatus.ISSUED,
      });
      mockPrisma.deliveryChallan.update.mockResolvedValue({
        id: 'dc-1',
        status: ChallanStatus.DELIVERED,
      });

      const updated = await service.changeStatus('dc-1', ChallanStatus.DELIVERED);
      expect(updated.status).toBe(ChallanStatus.DELIVERED);
    });

    it('should soft delete by setting isActive: false', async () => {
      mockPrisma.deliveryChallan.findUnique.mockResolvedValue({
        id: 'dc-1',
        isActive: true,
      });
      mockPrisma.deliveryChallan.update.mockResolvedValue({
        id: 'dc-1',
        isActive: false,
      });

      const res = await service.remove('dc-1');
      expect(res.isActive).toBe(false);
      expect(mockPrisma.deliveryChallan.update).toHaveBeenCalledWith({
        where: { id: 'dc-1' },
        data: { isActive: false },
      });
    });
  });
});
