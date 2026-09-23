import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PackingMaterialService } from './packing-material.service';

describe('PackingMaterialService Unit Tests', () => {
  let service: PackingMaterialService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      packingMaterial: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new PackingMaterialService(mockPrisma);
  });

  it('should create packing material when code is unique', async () => {
    mockPrisma.packingMaterial.findUnique.mockResolvedValue(null);
    mockPrisma.packingMaterial.create.mockResolvedValue({
      id: 'pkg-1',
      materialCode: 'PKG-ALU-01',
      description: 'Alu Foil 200mm',
    });

    const result = await service.create({
      materialCode: 'pkg-alu-01',
      description: 'Alu Foil 200mm',
      type: 'PRIMARY',
      uom: 'ROLL',
    });

    expect(result.material.materialCode).toBe('PKG-ALU-01');
  });

  it('should throw BadRequestException if materialCode exists', async () => {
    mockPrisma.packingMaterial.findUnique.mockResolvedValue({
      id: 'pkg-old',
      materialCode: 'PKG-ALU-01',
    });

    await expect(
      service.create({
        materialCode: 'PKG-ALU-01',
        description: 'Alu Foil',
        type: 'PRIMARY',
        uom: 'ROLL',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
