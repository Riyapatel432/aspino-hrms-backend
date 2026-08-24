import { Test, TestingModule } from '@nestjs/testing';
import { LeaveService } from './leave.service';
import { LeaveRepository } from '../repositories/leave.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('LeaveService', () => {
  let service: LeaveService;
  let leaveRepo: any;
  let prisma: any;

  beforeEach(async () => {
    leaveRepo = {
      findManyHolidays: jest.fn().mockResolvedValue({
        data: [{ id: 'hol-1', name: 'New Year', date: new Date('2026-01-01') }],
        total: 1,
        page: 1,
        limit: 10,
      }),
      createHoliday: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ id: 'hol-1', ...dto })),
      updateHoliday: jest
        .fn()
        .mockImplementation((id, dto) => Promise.resolve({ id, ...dto })),
      deleteHoliday: jest.fn().mockResolvedValue({ id: 'hol-1' }),
      findManyLeaveTypes: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 }),
      findManyApplications: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 }),
      createLeaveApplication: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ id: 'app-1', ...dto })),
    };

    prisma = {
      holiday: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      leaveApplication: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: LeaveRepository, useValue: leaveRepo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createHoliday', () => {
    it('should create holiday successfully', async () => {
      const dto = { name: 'Independence Day', date: '2026-08-15' };
      const res = await service.createHoliday(dto);
      expect(res.name).toBe('Independence Day');
      expect(leaveRepo.createHoliday).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException if holiday already exists on same date', async () => {
      prisma.holiday.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createHoliday({ name: 'Duplicate', date: '2026-08-15' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getHolidays', () => {
    it('should return paginated holidays', async () => {
      const res = await service.getHolidays({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
    });
  });
});
