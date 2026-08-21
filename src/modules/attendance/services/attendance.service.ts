import { Injectable, ConflictException } from '@nestjs/common';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

export interface UpdateShiftDto {
  name?: string;
  startTime?: string;
  endTime?: string;
  graceTimeMinutes?: number;
  breakDurationMinutes?: number;
  breakRules?: string;
  isNightShift?: boolean;
  color?: string;
  description?: string;
}

export interface UpdateRosterDto {
  employeeId?: string;
  shiftId?: string;
  date?: string;
  departmentId?: string;
  managedByHod?: string;
  reason?: string;
}

export interface UpdateAttendanceDto {
  checkIn?: string;
  checkOut?: string;
  status?: string;
  totalWorkHours?: number;
  otHours?: number;
  lateHours?: number;
  earlyGoingHours?: number;
  presentDay?: number;
  isHalfDay?: boolean;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly prisma: PrismaService,
  ) { }

  async getShifts(query: PaginationQueryDto = {}) {
    const res = await this.attendanceRepository.findManyShifts(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createShift(dto: {
    name: string;
    startTime: string;
    endTime: string;
    graceTimeMinutes?: number;
    breakDurationMinutes?: number;
    breakRules?: string;
    isNightShift?: boolean;
    color?: string;
    description?: string;
  }) {
    const existing = await this.prisma.shift.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('A shift with this name already exists.');
    }
    return this.attendanceRepository.createShift(dto as any);
  }

  async updateShift(id: string, dto: UpdateShiftDto) {
    if (dto.name) {
      const existing = await this.prisma.shift.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('A shift with this name already exists.');
      }
    }
    return this.attendanceRepository.updateShift(id, dto);
  }

  async deleteShift(id: string) {
    return this.attendanceRepository.deleteShift(id);
  }

  async getRosters(
    query: PaginationQueryDto & {
      employeeId?: string;
      shiftId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
      month?: string | number;
      year?: string | number;
    } = {},
  ) {
    const res = await this.attendanceRepository.findManyRosters(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createRoster(dto: {
    employeeId: string;
    shiftId: string;
    date: string;
    departmentId?: string;
    managedByHod?: string;
    reason?: string;
    changedByName?: string;
    changedByRole?: string;
  }) {
    return this.attendanceRepository.createRoster(dto);
  }

  async bulkCreateRosters(dto: {
    departmentId?: string;
    employeeIds: string[];
    shiftId: string;
    startDate: string;
    endDate: string;
    daysOfWeek?: number[];
    reason?: string;
    managedByHod?: string;
    changedByName?: string;
    changedByRole?: string;
  }) {
    return this.attendanceRepository.bulkCreateRosters(dto);
  }

  async changeShift(
    rosterId: string,
    dto: {
      newShiftId: string;
      reason?: string;
      changedById?: string;
      changedByName?: string;
      changedByRole?: string;
    },
  ) {
    return this.attendanceRepository.changeShift(rosterId, dto);
  }

  async getShiftAuditLogs(
    query: PaginationQueryDto & {
      employeeId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const res = await this.attendanceRepository.findManyShiftAuditLogs(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async updateRoster(id: string, dto: UpdateRosterDto) {
    return this.attendanceRepository.updateRoster(id, dto);
  }

  async deleteRoster(id: string) {
    return this.attendanceRepository.deleteRoster(id);
  }

  async getAttendance(query: PaginationQueryDto & { employeeId?: string; status?: string; date?: string; month?: string | number; year?: string | number } = {}) {
    const res = await this.attendanceRepository.findManyAttendance(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
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
    return this.attendanceRepository.captureAttendance(dto);
  }

  async bulkImportAttendance(records: any[]) {
    return this.attendanceRepository.bulkImportAttendance(records);
  }

  async updateAttendance(id: string, dto: UpdateAttendanceDto) {
    return this.attendanceRepository.updateAttendance(id, dto);
  }

  async deleteAttendance(id: string) {
    return this.attendanceRepository.deleteAttendance(id);
  }

  // --- Break Misuse Incidents ---
  async getBreakIncidents(query: PaginationQueryDto & { employeeId?: string; departmentId?: string; date?: string } = {}) {
    const res = await this.attendanceRepository.findManyBreakIncidents(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createBreakIncident(dto: any) {
    return this.attendanceRepository.createBreakIncident(dto);
  }

  async deleteBreakIncident(id: string) {
    return this.attendanceRepository.deleteBreakIncident(id);
  }
}
