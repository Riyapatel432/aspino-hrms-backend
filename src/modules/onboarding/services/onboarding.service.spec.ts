import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { OnboardingRepository } from '../repositories/onboarding.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let repo: any;
  let prisma: any;

  beforeEach(async () => {
    repo = {
      findTasks: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createTask: jest.fn().mockResolvedValue({ id: 'task-1' }),
    };

    prisma = {
      onboardingTask: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: OnboardingRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
