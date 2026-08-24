import { Test, TestingModule } from '@nestjs/testing';
import { ExitController } from './exit.controller';
import { ExitService } from '../services/exit.service';

describe('ExitController', () => {
  let controller: ExitController;
  let service: any;

  beforeEach(async () => {
    service = {
      getResignations: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createResignation: jest.fn().mockResolvedValue({ id: 'res-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExitController],
      providers: [{ provide: ExitService, useValue: service }],
    }).compile();

    controller = module.get<ExitController>(ExitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
