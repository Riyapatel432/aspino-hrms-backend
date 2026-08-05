import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../../common/utils/search.util';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyShifts(query: PaginationQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
    } else {
      orderBy.name = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.shift.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createShift(dto: { name: string; startTime: string; endTime: string }) {
    return this.prisma.shift.create({
      data: dto,
    });
  }

  async updateShift(id: string, dto: any) {
    return this.prisma.shift.update({
      where: { id },
      data: dto,
    });
  }

  async deleteShift(id: string) {
    // Delete rosters referencing this shift first
    await this.prisma.shiftRoster.deleteMany({ where: { shiftId: id } });
    return this.prisma.shift.delete({
      where: { id },
    });
  }

  async findManyRosters(
    query: PaginationQueryDto & { employeeId?: string; shiftId?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftRosterWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { shift: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.shiftId) {
      where.shiftId = query.shiftId;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.date = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.shiftRoster.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true, shift: true },
        orderBy,
      }),
      this.prisma.shiftRoster.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createRoster(dto: {
    employeeId: string;
    shiftId: string;
    date: string;
  }) {
    return this.prisma.shiftRoster.create({
      data: {
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        date: new Date(dto.date),
      },
    });
  }

  async updateRoster(id: string, dto: any) {
    if (dto.date) dto.date = new Date(dto.date);
    return this.prisma.shiftRoster.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRoster(id: string) {
    return this.prisma.shiftRoster.delete({
      where: { id },
    });
  }

  async findManyAttendance(
    query: PaginationQueryDto & { employeeId?: string; status?: string; date?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { shiftName: { contains: query.search, mode: 'insensitive' } },
        { status: { contains: query.search, mode: 'insensitive' } },
        { captureMethod: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.date) {
      where.date = new Date(query.date);
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.date = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy,
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async captureAttendance(dto: {
    employeeId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status?: string;
    shiftId?: string;
    shiftName?: string;
    totalWorkHours?: number;
    otHours?: number;
    lateHours?: number;
    earlyGoingHours?: number;
    presentDay?: number;
    isHalfDay?: boolean;
    isSundayPresent?: boolean;
    isFullNightPresent?: boolean;
    isHolidayPresent?: boolean;
    captureMethod?: string;
  }) {
    const dateObj = new Date(dto.date);
    const existing = await this.prisma.attendance.findFirst({
      where: { employeeId: dto.employeeId, date: dateObj },
    });

    const dataPayload = {
      checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
      checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      status: dto.status || 'PRESENT',
      shiftId: dto.shiftId,
      shiftName: dto.shiftName,
      totalWorkHours: dto.totalWorkHours,
      otHours: dto.otHours,
      lateHours: dto.lateHours,
      earlyGoingHours: dto.earlyGoingHours,
      presentDay: dto.presentDay,
      isHalfDay: dto.isHalfDay,
      isSundayPresent: dto.isSundayPresent,
      isFullNightPresent: dto.isFullNightPresent,
      isHolidayPresent: dto.isHolidayPresent,
      captureMethod: dto.captureMethod || 'BIOMETRIC',
    };

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: dataPayload,
      });
    } else {
      return this.prisma.attendance.create({
        data: {
          employeeId: dto.employeeId,
          date: dateObj,
          ...dataPayload,
        },
      });
    }
  }

  async updateAttendance(id: string, dto: any) {
    if (dto.date) dto.date = new Date(dto.date);
    if (dto.checkIn) dto.checkIn = new Date(dto.checkIn);
    if (dto.checkOut) dto.checkOut = new Date(dto.checkOut);
    return this.prisma.attendance.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAttendance(id: string) {
    return this.prisma.attendance.delete({
      where: { id },
    });
  }
}
