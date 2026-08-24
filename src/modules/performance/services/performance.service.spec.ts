import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from './performance.service';
import { PerformanceRepository } from '../repositories/performance.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let repo: any;
  let prisma: any;

  beforeEach(async () => {
    repo = {
      findAppraisals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createAppraisal: jest.fn().mockResolvedValue({ id: 'appr-1' }),
      findGoals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    prisma = {
      appraisal: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: PerformanceRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
