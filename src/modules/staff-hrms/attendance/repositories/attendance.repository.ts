import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyShifts() {
    return this.prisma.shift.findMany();
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

  async findManyRosters() {
    return this.prisma.shiftRoster.findMany({
      include: { employee: true, shift: true },
    });
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

  async findManyAttendance() {
    return this.prisma.attendance.findMany({
      include: { employee: true },
      orderBy: { date: 'desc' },
    });
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
