import { Test, TestingModule } from '@nestjs/testing';
import { PayrollController } from './payroll.controller';
import { PayrollService } from '../services/payroll.service';

describe('PayrollController', () => {
  let controller: PayrollController;
  let service: any;

  beforeEach(async () => {
    service = {
      getBanks: jest.fn().mockResolvedValue([{ id: 1, name: 'HDFC' }]),
      setupSalaryStructure: jest.fn().mockResolvedValue({ id: 'sal-1' }),
      getSalaryStructures: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      generatePayroll: jest
        .fn()
        .mockResolvedValue({ message: 'Payroll generated' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [{ provide: PayrollService, useValue: service }],
    }).compile();

    controller = module.get<PayrollController>(PayrollController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return banks', async () => {
    const res = await controller.getBanks();
    expect(res).toEqual([{ id: 1, name: 'HDFC' }]);
  });
});
