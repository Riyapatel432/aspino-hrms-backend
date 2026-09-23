import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QcSpecificationService } from './qc-specification.service';

describe('QcSpecificationService Unit Tests', () => {
  let service: QcSpecificationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      qcSpecification: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new QcSpecificationService(mockPrisma);
  });

  it('should create QC spec when code is unique', async () => {
    mockPrisma.qcSpecification.findUnique.mockResolvedValue(null);
    mockPrisma.qcSpecification.create.mockResolvedValue({
      id: 'qc-1',
      specCode: 'QC-RM-001',
      itemName: 'Paracetamol',
    });

    const result = await service.create({
      specCode: 'qc-rm-001',
      productMaterialCode: 'MAT-001',
      itemName: 'Paracetamol',
      itemType: 'RAW_MATERIAL',
      testParameters: [{ parameterName: 'Purity', standardLimit: '>= 99.0%' }],
    });

    expect(result.specification.specCode).toBe('QC-RM-001');
  });

  it('should throw BadRequestException if specCode exists', async () => {
    mockPrisma.qcSpecification.findUnique.mockResolvedValue({
      id: 'qc-old',
      specCode: 'QC-RM-001',
    });

    await expect(
      service.create({
        specCode: 'QC-RM-001',
        productMaterialCode: 'MAT-001',
        itemName: 'Paracetamol',
        itemType: 'RAW_MATERIAL',
        testParameters: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
