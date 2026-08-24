import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepo: any;
  let prisma: any;

  beforeEach(async () => {
    attendanceRepo = {
      findManyShifts: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'shift-1',
            name: 'General Shift',
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      }),
      createShift: jest
        .fn()
        .mockImplementation((dto) =>
          Promise.resolve({ id: 'shift-1', ...dto }),
        ),
      updateShift: jest
        .fn()
        .mockImplementation((id, dto) => Promise.resolve({ id, ...dto })),
      deleteShift: jest.fn().mockResolvedValue({ id: 'shift-1' }),
      findManyRosters: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 }),
      createRoster: jest
        .fn()
        .mockImplementation((dto) =>
          Promise.resolve({ id: 'roster-1', ...dto }),
        ),
      findManyAttendance: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 }),
      captureAttendance: jest
        .fn()
        .mockResolvedValue({ id: 'att-1', status: 'PRESENT' }),
    };

    prisma = {
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      attendanceBreakIncident: {
        create: jest.fn().mockResolvedValue({ id: 'break-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceRepository, useValue: attendanceRepo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get paginated shifts', async () => {
    const res = await service.getShifts({ page: 1, limit: 10 });
    expect(attendanceRepo.findManyShifts).toHaveBeenCalled();
    expect(res.data).toHaveLength(1);
    expect(res.data[0].name).toBe('General Shift');
  });

  it('should create a shift', async () => {
    const shiftData = {
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      isNightShift: true,
    };
    const res = await service.createShift(shiftData);
    expect(attendanceRepo.createShift).toHaveBeenCalledWith(shiftData);
    expect(res.name).toBe('Night Shift');
  });

  it('should update a shift', async () => {
    const res = await service.updateShift('shift-1', { name: 'Updated Shift' });
    expect(attendanceRepo.updateShift).toHaveBeenCalledWith('shift-1', {
      name: 'Updated Shift',
    });
    expect(res.name).toBe('Updated Shift');
  });

  it('should delete a shift', async () => {
    const res = await service.deleteShift('shift-1');
    expect(attendanceRepo.deleteShift).toHaveBeenCalledWith('shift-1');
    expect(res.id).toBe('shift-1');
  });

  it('should capture attendance punch', async () => {
    const res = await service.captureAttendance({
      employeeId: 'EMP001',
      punchType: 'CHECK_IN',
      timestamp: new Date().toISOString(),
    });
    expect(attendanceRepo.captureAttendance).toHaveBeenCalled();
    expect(res.status).toBe('PRESENT');
  });
});
