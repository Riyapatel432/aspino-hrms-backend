import { CaslAbilityFactory } from '../../casl/casl-ability.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { TrainingController } from './training.controller';
import { TrainingService } from '../services/training.service';

describe('TrainingController', () => {
  let controller: TrainingController;
  let service: any;

  beforeEach(async () => {
    service = {
      getPrograms: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createProgram: jest.fn().mockResolvedValue({ id: 'tp-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingController],
      providers: [{ provide: TrainingService, useValue: service }, { provide: CaslAbilityFactory, useValue: { createForUser: jest.fn(), getUserPermissionsPayload: jest.fn() } }],
    }).compile();

    controller = module.get<TrainingController>(TrainingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
