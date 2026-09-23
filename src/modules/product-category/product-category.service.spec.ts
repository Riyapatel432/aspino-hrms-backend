import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductCategoryService } from './product-category.service';

describe('ProductCategoryService Unit Tests', () => {
  let service: ProductCategoryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      productCategory: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      product: {
        count: jest.fn().mockResolvedValue(0),
      },
      productSubCategory: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new ProductCategoryService(mockPrisma);
  });

  it('should create product category when code is unique', async () => {
    mockPrisma.productCategory.findUnique.mockResolvedValue(null);
    mockPrisma.productCategory.findFirst.mockResolvedValue(null);
    mockPrisma.productCategory.create.mockResolvedValue({
      id: 'cat-1',
      categoryCode: 'CAT-MED-01',
      categoryName: 'Medicines',
    });

    const result = await service.create({
      categoryCode: 'cat-med-01',
      categoryName: 'Medicines',
    });

    expect(result.category.categoryCode).toBe('CAT-MED-01');
  });

  it('should throw BadRequestException if categoryCode exists', async () => {
    mockPrisma.productCategory.findUnique.mockResolvedValue({
      id: 'cat-old',
      categoryCode: 'CAT-MED-01',
    });

    await expect(
      service.create({
        categoryCode: 'CAT-MED-01',
        categoryName: 'Medicines',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
