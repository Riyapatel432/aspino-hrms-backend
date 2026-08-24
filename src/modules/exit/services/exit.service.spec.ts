import { Test, TestingModule } from '@nestjs/testing';
import { ExitService } from './exit.service';
import { ExitRepository } from '../repositories/exit.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PayrollService } from '../../payroll/services/payroll.service';

describe('ExitService', () => {
  let service: ExitService;
  let repo: any;
  let prisma: any;
  let payrollService: any;

  beforeEach(async () => {
    repo = {
      findResignations: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createResignation: jest.fn().mockResolvedValue({ id: 'res-1' }),
      findManyExits: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    payrollService = {
      calculateFnFSettlement: jest.fn(),
    };

    prisma = {
      resignation: { findMany: jest.fn().mockResolvedValue([]) },
      exitProcess: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExitService,
        { provide: ExitRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
        { provide: PayrollService, useValue: payrollService },
      ],
    }).compile();

    service = module.get<ExitService>(ExitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
