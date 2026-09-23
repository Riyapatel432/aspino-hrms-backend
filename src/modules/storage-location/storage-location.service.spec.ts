import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageLocationService } from './storage-location.service';

describe('StorageLocationService Unit Tests', () => {
  let service: StorageLocationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      storageLocation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new StorageLocationService(mockPrisma);
  });

  it('should create storage location when code is unique', async () => {
    mockPrisma.storageLocation.findUnique.mockResolvedValue(null);
    mockPrisma.storageLocation.create.mockResolvedValue({
      id: 'loc-1',
      locationCode: 'LOC-RM-01',
      locationName: 'RM Store A',
    });

    const result = await service.create({
      locationCode: 'loc-rm-01',
      locationName: 'RM Store A',
      storageCondition: 'AMBIENT',
      linkedStoreType: 'RAW_MATERIAL_STORE',
      capacity: '1000 Units',
    });

    expect(result.location.locationCode).toBe('LOC-RM-01');
  });

  it('should throw BadRequestException if locationCode exists', async () => {
    mockPrisma.storageLocation.findUnique.mockResolvedValue({
      id: 'loc-old',
      locationCode: 'LOC-RM-01',
    });

    await expect(
      service.create({
        locationCode: 'LOC-RM-01',
        locationName: 'RM Store A',
        storageCondition: 'AMBIENT',
        linkedStoreType: 'RAW_MATERIAL_STORE',
        capacity: '1000 Units',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should find one location or throw NotFoundException', async () => {
    mockPrisma.storageLocation.findUnique.mockResolvedValue(null);
    await expect(service.findOne('loc-unknown')).rejects.toThrow(NotFoundException);
  });
});
