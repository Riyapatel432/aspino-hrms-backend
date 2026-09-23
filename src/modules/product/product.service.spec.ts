import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';

describe('ProductService Unit Tests', () => {
  let service: ProductService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      productCategory: {
        findUnique: jest.fn(),
      },
      productSubCategory: {
        findUnique: jest.fn(),
      },
    };

    service = new ProductService(mockPrisma);
  });

  describe('create', () => {
    it('should create product when code is unique and category exists', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.productCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.product.create.mockResolvedValue({
        id: 'p-1',
        productCode: 'PRD-001',
        name: 'Paracetamol 500mg',
      });

      const result = await service.create({
        productCode: 'prd-001',
        name: 'Paracetamol 500mg',
        categoryId: 'cat-1',
        uom: 'TABLET',
        shelfLife: '24 Months',
        storageCondition: 'Ambient',
        standardCost: 100,
        hsnCode: '30049099',
      });

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ productCode: 'PRD-001' }),
        }),
      );
      expect(result.product.productCode).toBe('PRD-001');
      expect(result.message).toContain('Product created successfully');
    });

    it('should throw BadRequestException if productCode already exists', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p-old', productCode: 'PRD-001' });

      await expect(
        service.create({
          productCode: 'PRD-001',
          name: 'Paracetamol 500mg',
          categoryId: 'cat-1',
          uom: 'TABLET',
          shelfLife: '24 Months',
          storageCondition: 'Ambient',
          standardCost: 100,
          hsnCode: '30049099',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.productCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          productCode: 'PRD-001',
          name: 'Paracetamol 500mg',
          categoryId: 'invalid-cat',
          uom: 'TABLET',
          shelfLife: '24 Months',
          storageCondition: 'Ambient',
          standardCost: 100,
          hsnCode: '30049099',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return product when found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p-1', productCode: 'PRD-001' });
      const result = await service.findOne('p-1');
      expect(result).toEqual({ id: 'p-1', productCode: 'PRD-001' });
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne('p-unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
