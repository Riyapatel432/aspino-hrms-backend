import { Test, TestingModule } from '@nestjs/testing';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentRepository } from '../repositories/recruitment.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let repo: any;
  let prisma: any;

  beforeEach(async () => {
    repo = {
      findJobPostings: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createJobPosting: jest
        .fn()
        .mockResolvedValue({ id: 'job-1', title: 'Developer' }),
      findCandidates: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createCandidate: jest
        .fn()
        .mockResolvedValue({ id: 'cand-1', name: 'Alice' }),
    };

    prisma = {
      jobPosting: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      candidate: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        { provide: RecruitmentRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecruitmentService>(RecruitmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
