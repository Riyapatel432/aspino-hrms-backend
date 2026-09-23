import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PassCategoryService } from './pass-category.service';

describe('PassCategoryService Unit Tests', () => {
  let service: PassCategoryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      passCategory: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      gatePass: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new PassCategoryService(mockPrisma);
  });

  it('should create category when code is unique', async () => {
    mockPrisma.passCategory.findUnique.mockResolvedValue(null);
    mockPrisma.passCategory.findFirst.mockResolvedValue(null);
    mockPrisma.passCategory.create.mockResolvedValue({
      id: 'cat-1',
      code: 'RAW_MAT',
      name: 'Raw Material',
      type: 'INWARD',
    });

    const result = await service.create({
      code: 'raw_mat',
      name: 'Raw Material',
      type: 'INWARD' as any,
    });

    expect(result.category.code).toBe('RAW_MAT');
  });

  it('should throw BadRequestException if code exists', async () => {
    mockPrisma.passCategory.findUnique.mockResolvedValue({
      id: 'cat-old',
      code: 'RAW_MAT',
    });

    await expect(
      service.create({
        code: 'RAW_MAT',
        name: 'Raw Material',
        type: 'INWARD' as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
