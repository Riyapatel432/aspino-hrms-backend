import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';

describe('CustomerService Unit Tests', () => {
  let service: CustomerService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      customer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new CustomerService(mockPrisma);
  });

  describe('create', () => {
    it('should create a customer when code is unique', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({
        id: 'c-1',
        customerCode: 'CUST-001',
        name: 'Acme Corp',
        customerType: 'DOMESTIC',
        isDomestic: true,
      });

      const result = await service.create({
        customerCode: 'cust-001',
        name: ' Acme Corp ',
      });

      expect(mockPrisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerCode: 'CUST-001',
            name: 'Acme Corp',
            customerType: 'DOMESTIC',
            isDomestic: true,
          }),
        }),
      );
      expect(result.customer.customerCode).toBe('CUST-001');
      expect(result.message).toContain('Customer registered successfully');
    });

    it('should throw BadRequestException if customerCode already exists', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'c-old', customerCode: 'CUST-001' });

      await expect(
        service.create({
          customerCode: 'CUST-001',
          name: 'Acme Corp',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return customer when found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'c-1', name: 'Acme' });
      const result = await service.findOne('c-1');
      expect(result).toEqual({ id: 'c-1', name: 'Acme' });
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.findOne('c-unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll pagination & filters', () => {
    it('should return paginated data with correct totalPages and metrics', async () => {
      mockPrisma.customer.count
        .mockResolvedValueOnce(25) // total filtered
        .mockResolvedValueOnce(30) // totalAll
        .mockResolvedValueOnce(20) // totalDomestic
        .mockResolvedValueOnce(10) // totalExport
        .mockResolvedValueOnce(28); // totalActive

      mockPrisma.customer.findMany.mockResolvedValue([
        { id: 'c-1', name: 'Customer 1' },
        { id: 'c-2', name: 'Customer 2' },
      ]);

      const result = (await service.findAll('search', 'DOMESTIC', 'active', 1, 10)) as any;
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.metrics.totalCustomers).toBe(30);
    });
  });
});
