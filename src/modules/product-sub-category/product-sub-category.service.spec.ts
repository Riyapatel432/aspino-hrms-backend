import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductSubCategoryService } from './product-sub-category.service';

describe('ProductSubCategoryService Unit Tests', () => {
  let service: ProductSubCategoryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      productSubCategory: {
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
      product: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new ProductSubCategoryService(mockPrisma);
  });

  it('should create sub-category when code is unique and parent category exists', async () => {
    mockPrisma.productSubCategory.findUnique.mockResolvedValue(null);
    mockPrisma.productCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    mockPrisma.productSubCategory.create.mockResolvedValue({
      id: 'sub-1',
      subCategoryCode: 'SUB-TAB-01',
      subCategoryName: 'Tablets',
      categoryId: 'cat-1',
    });

    const result = await service.create({
      subCategoryCode: 'sub-tab-01',
      subCategoryName: 'Tablets',
      categoryId: 'cat-1',
    });

    expect(result.subCategory.subCategoryCode).toBe('SUB-TAB-01');
  });

  it('should throw BadRequestException if subCategoryCode exists', async () => {
    mockPrisma.productCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    mockPrisma.productSubCategory.findUnique.mockResolvedValue({
      id: 'sub-old',
      subCategoryCode: 'SUB-TAB-01',
    });

    await expect(
      service.create({
        subCategoryCode: 'SUB-TAB-01',
        subCategoryName: 'Tablets',
        categoryId: 'cat-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
