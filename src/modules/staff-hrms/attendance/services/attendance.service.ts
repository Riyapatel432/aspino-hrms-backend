import { Injectable, ConflictException } from '@nestjs/common';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface UpdateShiftDto {
  name?: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateRosterDto {
  employeeId?: string;
  shiftId?: string;
  date?: string;
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
  ) {}

  async getShifts() {
    return this.attendanceRepository.findManyShifts();
  }

  async createShift(dto: { name: string; startTime: string; endTime: string }) {
    const existing = await this.prisma.shift.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('A shift with this name already exists.');
    }
    return this.attendanceRepository.createShift(dto);
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

  async getRosters() {
    return this.attendanceRepository.findManyRosters();
  }

  async createRoster(dto: {
    employeeId: string;
    shiftId: string;
    date: string;
  }) {
    const targetDate = new Date(dto.date);
    const existing = await this.prisma.shiftRoster.findFirst({
      where: {
        employeeId: dto.employeeId,
        date: targetDate,
      },
    });
    if (existing) {
      throw new ConflictException(
        'A shift roster already exists for this employee on this date.',
      );
    }
    return this.attendanceRepository.createRoster(dto);
  }

  async updateRoster(id: string, dto: UpdateRosterDto) {
    if (dto.employeeId || dto.date) {
      const current = await this.prisma.shiftRoster.findUnique({
        where: { id },
      });

      const empIdStr = dto.employeeId ?? current?.employeeId;
      const dateStr = dto.date ?? current?.date;
      const targetDate = dateStr ? new Date(dateStr) : undefined;

      if (empIdStr && targetDate) {
        const existing = await this.prisma.shiftRoster.findFirst({
          where: {
            employeeId: empIdStr,
            date: targetDate,
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            'A shift roster already exists for this employee on this date.',
          );
        }
      }
    }
    return this.attendanceRepository.updateRoster(id, dto);
  }

  async deleteRoster(id: string) {
    return this.attendanceRepository.deleteRoster(id);
  }

  async getAttendance() {
    return this.attendanceRepository.findManyAttendance();
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

  async updateAttendance(id: string, dto: UpdateAttendanceDto) {
    return this.attendanceRepository.updateAttendance(id, dto);
  }

  async deleteAttendance(id: string) {
    return this.attendanceRepository.deleteAttendance(id);
  }
}
