import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SupplierService } from './supplier.service';

describe('SupplierService Unit Tests', () => {
  let service: SupplierService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      supplier: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.8 } }),
      },
      bank: {
        findUnique: jest.fn(),
      },
    };

    service = new SupplierService(mockPrisma);
  });

  describe('create', () => {
    it('should create supplier when code is unique', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      mockPrisma.supplier.create.mockResolvedValue({
        id: 's-1',
        code: 'SUP-001',
        name: 'Supplier One',
        gstNo: 'GSTIN12345',
      });

      const result = await service.create({
        code: 'sup-001',
        name: 'Supplier One',
        gstNo: 'gstin12345',
      });

      expect(mockPrisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SUP-001', gstNo: 'GSTIN12345' }),
        }),
      );
      expect(result.supplier.code).toBe('SUP-001');
      expect(result.message).toContain('Supplier registered successfully');
    });

    it('should throw BadRequestException if supplier code already exists', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-old', code: 'SUP-001' });

      await expect(
        service.create({
          code: 'SUP-001',
          name: 'Supplier One',
          gstNo: 'GST123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated supplier list with rating & counts', async () => {
      mockPrisma.supplier.count
        .mockResolvedValueOnce(30) // total
        .mockResolvedValueOnce(28); // totalApproved

      mockPrisma.supplier.findMany
        .mockResolvedValueOnce([{ id: 's-1', code: 'SUP-001' }]) // page items
        .mockResolvedValueOnce([
          { approvedCategories: ['API', 'Excipients'] },
          { approvedCategories: ['Packing'] },
        ]); // categories

      const result = (await service.findAll('search', 1, 10)) as any;
      expect(result.total).toBe(30);
      expect(result.totalPages).toBe(3);
      expect(result.totalApproved).toBe(28);
      expect(result.averageRating).toBe(4.8);
      expect(result.totalCategoriesCount).toBe(3);
    });
  });
});
