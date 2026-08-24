import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from '../services/attendance.service';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let service: any;

  beforeEach(async () => {
    service = {
      getShifts: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createShift: jest.fn().mockResolvedValue({ id: 's-1', name: 'Morning' }),
      updateShift: jest.fn().mockResolvedValue({ id: 's-1', name: 'Updated' }),
      deleteShift: jest.fn().mockResolvedValue({ id: 's-1' }),
      getRosters: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createRoster: jest.fn().mockResolvedValue({ id: 'r-1' }),
      bulkCreateRoster: jest.fn().mockResolvedValue({ count: 5 }),
      captureAttendance: jest.fn().mockResolvedValue({ id: 'att-1' }),
      createBreakIncident: jest.fn().mockResolvedValue({ id: 'break-1' }),
      getBreakIncidents: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: service }],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get shifts with pagination', async () => {
    const res = await controller.getShifts({ page: 1, limit: 10 });
    expect(service.getShifts).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(res).toEqual({ data: [], total: 0 });
  });

  it('should create shift', async () => {
    const dto = {
      name: 'Morning',
      startTime: '09:00',
      endTime: '18:00',
    };
    const res = await controller.createShift(dto);
    expect(service.createShift).toHaveBeenCalledWith(dto);
    expect(res.id).toBe('s-1');
  });

  it('should delete shift', async () => {
    const res = await controller.deleteShift('s-1');
    expect(service.deleteShift).toHaveBeenCalledWith('s-1');
    expect(res.id).toBe('s-1');
  });
});
