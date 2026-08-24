import { Test, TestingModule } from '@nestjs/testing';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from '../services/recruitment.service';

describe('RecruitmentController', () => {
  let controller: RecruitmentController;
  let service: any;

  beforeEach(async () => {
    service = {
      getJobPostings: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createJobPosting: jest
        .fn()
        .mockResolvedValue({ id: 'job-1', title: 'React Dev' }),
      getCandidates: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createCandidate: jest.fn().mockResolvedValue({ id: 'c-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruitmentController],
      providers: [{ provide: RecruitmentService, useValue: service }],
    }).compile();

    controller = module.get<RecruitmentController>(RecruitmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
