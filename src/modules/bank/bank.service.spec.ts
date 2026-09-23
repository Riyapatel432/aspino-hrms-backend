import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BankService } from './bank.service';

describe('BankService Unit Tests', () => {
  let service: BankService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      bank: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new BankService(mockPrisma);
  });

  it('should create bank when name is unique', async () => {
    mockPrisma.bank.findUnique.mockResolvedValue(null);
    mockPrisma.bank.create.mockResolvedValue({ id: 'b-1', name: 'HDFC Bank' });

    const result = await service.create({ name: 'HDFC Bank' });
    expect(result.bank.name).toBe('HDFC Bank');
  });

  it('should throw BadRequestException if bank name exists', async () => {
    mockPrisma.bank.findUnique.mockResolvedValue({ id: 'b-old', name: 'HDFC Bank' });
    await expect(service.create({ name: 'HDFC Bank' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should find one bank or throw NotFoundException', async () => {
    mockPrisma.bank.findUnique.mockResolvedValue(null);
    await expect(service.findOne('b-unknown')).rejects.toThrow(NotFoundException);
  });
});
