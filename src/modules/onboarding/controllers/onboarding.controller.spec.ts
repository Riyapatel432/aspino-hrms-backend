import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from '../services/onboarding.service';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let service: any;

  beforeEach(async () => {
    service = {
      getTasks: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createTask: jest.fn().mockResolvedValue({ id: 'task-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: OnboardingService, useValue: service }],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
