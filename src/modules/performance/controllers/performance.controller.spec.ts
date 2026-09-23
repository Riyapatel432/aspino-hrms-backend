import { CaslAbilityFactory } from '../../casl/casl-ability.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from '../services/performance.service';

describe('PerformanceController', () => {
  let controller: PerformanceController;
  let service: any;

  beforeEach(async () => {
    service = {
      getAppraisals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createAppraisal: jest.fn().mockResolvedValue({ id: 'appr-1' }),
      getGoals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformanceController],
      providers: [{ provide: PerformanceService, useValue: service }, { provide: CaslAbilityFactory, useValue: { createForUser: jest.fn(), getUserPermissionsPayload: jest.fn() } }],
    }).compile();

    controller = module.get<PerformanceController>(PerformanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
