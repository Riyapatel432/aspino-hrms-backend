import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VendorService } from './vendor.service';

describe('VendorService Unit Tests', () => {
  let service: VendorService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      vendor: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new VendorService(mockPrisma);
  });

  describe('create', () => {
    it('should create vendor successfully when code is unique', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.create.mockResolvedValue({
        id: 'v-1',
        code: 'VND-001',
        name: 'Vendor One',
        serviceType: 'Transport',
      });

      const result = await service.create({
        code: 'vnd-001',
        name: 'Vendor One',
        serviceType: 'Transport',
      });

      expect(mockPrisma.vendor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'VND-001' }),
        }),
      );
      expect(result.vendor.code).toBe('VND-001');
      expect(result.message).toContain('Vendor registered successfully');
    });

    it('should throw BadRequestException if vendor code exists', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ id: 'v-old', code: 'VND-001' });

      await expect(
        service.create({
          code: 'VND-001',
          name: 'Vendor One',
          serviceType: 'Transport',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return vendor if found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ id: 'v-1', name: 'Vendor 1' });
      const result = await service.findOne('v-1');
      expect(result).toEqual({ id: 'v-1', name: 'Vendor 1' });
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.findOne('v-unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated vendor list with computed stats and distinct categories', async () => {
      mockPrisma.vendor.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45); // totalApproved

      mockPrisma.vendor.findMany
        .mockResolvedValueOnce([{ id: 'v-1', code: 'VND-001' }]) // page items
        .mockResolvedValueOnce([
          { serviceType: 'Transport' },
          { serviceType: 'Maintenance' },
        ]); // distinct categories

      const result = (await service.findAll('search', 1, 10)) as any;
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(5);
      expect(result.totalApproved).toBe(45);
      expect(result.totalCategories).toBe(2);
      expect(result.page).toBe(1);
    });
  });
});
