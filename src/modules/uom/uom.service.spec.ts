import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UomService } from './uom.service';

describe('UomService Unit Tests', () => {
  let service: UomService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      uom: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new UomService(mockPrisma);
  });

  it('should create UOM when code is unique', async () => {
    mockPrisma.uom.findUnique.mockResolvedValue(null);
    mockPrisma.uom.create.mockResolvedValue({
      id: 'u-1',
      uomCode: 'KG',
      uomName: 'Kilogram',
    });

    const result = await service.create({ uomCode: 'kg', uomName: 'Kilogram' });
    expect(result.uom.uomCode).toBe('KG');
    expect(mockPrisma.uom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uomCode: 'KG' }),
      }),
    );
  });

  it('should throw BadRequestException if uomCode exists', async () => {
    mockPrisma.uom.findUnique.mockResolvedValue({ id: 'u-old', uomCode: 'KG' });
    await expect(
      service.create({ uomCode: 'KG', uomName: 'Kilogram' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should find one UOM or throw NotFoundException', async () => {
    mockPrisma.uom.findUnique.mockResolvedValue(null);
    await expect(service.findOne('u-unknown')).rejects.toThrow(NotFoundException);
  });
});
