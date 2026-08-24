import { Test, TestingModule } from '@nestjs/testing';
import { LeaveController } from './leave.controller';
import { LeaveService } from '../services/leave.service';

describe('LeaveController', () => {
  let controller: LeaveController;
  let service: any;

  beforeEach(async () => {
    service = {
      getHolidays: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createHoliday: jest
        .fn()
        .mockResolvedValue({ id: 'h-1', name: 'Holiday' }),
      updateHoliday: jest
        .fn()
        .mockResolvedValue({ id: 'h-1', name: 'Updated' }),
      deleteHoliday: jest.fn().mockResolvedValue({ id: 'h-1' }),
      getLeaveTypes: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getApplications: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createApplication: jest.fn().mockResolvedValue({ id: 'app-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveController],
      providers: [{ provide: LeaveService, useValue: service }],
    }).compile();

    controller = module.get<LeaveController>(LeaveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get holidays', async () => {
    const res = await controller.getHolidays({ page: 1, limit: 10 });
    expect(service.getHolidays).toHaveBeenCalled();
    expect(res).toEqual({ data: [], total: 0 });
  });

  it('should create holiday', async () => {
    const dto = { name: 'Diwali', date: '2026-11-01' };
    const res = await controller.createHoliday(dto);
    expect(service.createHoliday).toHaveBeenCalledWith(dto);
    expect(res.id).toBe('h-1');
  });
});
