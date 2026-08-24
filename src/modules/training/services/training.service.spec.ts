import { Test, TestingModule } from '@nestjs/testing';
import { TrainingService } from './training.service';
import { TrainingRepository } from '../repositories/training.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('TrainingService', () => {
  let service: TrainingService;
  let repo: any;
  let prisma: any;

  beforeEach(async () => {
    repo = {
      findPrograms: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createProgram: jest.fn().mockResolvedValue({ id: 'tp-1' }),
      findSessions: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    prisma = {
      trainingProgram: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: TrainingRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
