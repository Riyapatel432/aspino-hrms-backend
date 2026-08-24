import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { PayrollRepository } from '../repositories/payroll.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('PayrollService', () => {
  let service: PayrollService;
  let repo: any;
  let prisma: any;

  beforeEach(async () => {
    repo = {
      createSalaryStructure: jest.fn(),
      findSalaryStructures: jest.fn().mockResolvedValue([]),
      generatePayroll: jest.fn(),
    };

    prisma = {
      bank: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 1, name: 'HDFC Bank', isActive: true }]),
        createMany: jest.fn(),
      },
      employee: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'emp-1', employeeId: 'EMP001' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PayrollRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBanks', () => {
    it('should return banks from database', async () => {
      const banks = await service.getBanks();
      expect(banks).toHaveLength(1);
      expect(banks[0].name).toBe('HDFC Bank');
    });
  });
});
