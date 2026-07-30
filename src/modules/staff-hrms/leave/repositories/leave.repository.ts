import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class LeaveRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyHolidays() {
    return this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  }

  async createHoliday(dto: { name: string; date: string }) {
    return this.prisma.holiday.create({
      data: {
        name: dto.name,
        date: new Date(dto.date),
      },
    });
  }

  async updateHoliday(id: string, dto: any) {
    if (dto.date) dto.date = new Date(dto.date);
    return this.prisma.holiday.update({
      where: { id },
      data: dto,
    });
  }

  async deleteHoliday(id: string) {
    return this.prisma.holiday.delete({
      where: { id },
    });
  }

  async findManyLeaveApplications() {
    return this.prisma.leaveApplication.findMany({
      include: { employee: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async createLeaveApplication(dto: { employeeId: string; leaveType: string; startDate: string; endDate: string; reason: string }) {
    return this.prisma.leaveApplication.create({
      data: {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
    });
  }

  async updateLeaveApplication(id: string, dto: any) {
    if (dto.startDate) dto.startDate = new Date(dto.startDate);
    if (dto.endDate) dto.endDate = new Date(dto.endDate);
    return this.prisma.leaveApplication.update({
      where: { id },
      data: dto,
    });
  }

  async deleteLeaveApplication(id: string) {
    return this.prisma.leaveApplication.delete({
      where: { id },
    });
  }

  async findLeaveApplication(id: string) {
    return this.prisma.leaveApplication.findUnique({
      where: { id },
    });
  }

  async updateLeaveStatus(id: string, status: string) {
    return this.prisma.leaveApplication.update({
      where: { id },
      data: { status },
    });
  }

  async findLeaveBalance(employeeId: string, leaveType: string) {
    return this.prisma.leaveBalance.findFirst({
      where: { employeeId, leaveType },
    });
  }

  async updateLeaveBalance(id: string, used: number) {
    return this.prisma.leaveBalance.update({
      where: { id },
      data: { used },
    });
  }

  async createLeaveLedger(dto: { employeeId: string; leaveType: string; change: number; reason: string }) {
    return this.prisma.leaveLedger.create({
      data: dto,
    });
  }

  // --- Department Leave Master ---
  async findManyLeaveMasters() {
    return this.prisma.departmentLeaveMaster.findMany({
      orderBy: [{ fiscalYear: 'desc' }, { department: 'asc' }],
    });
  }

  async createLeaveMaster(dto: {
    department: string;
    fiscalYear: string;
    casualLeave: number;
    sickLeave: number;
    earnedLeave: number;
    otherLeave: number;
    effectiveFrom: string;
  }) {
    const total = dto.casualLeave + dto.sickLeave + dto.earnedLeave + (dto.otherLeave || 0);
    return this.prisma.departmentLeaveMaster.upsert({
      where: { department_fiscalYear: { department: dto.department, fiscalYear: dto.fiscalYear } },
      create: {
        department: dto.department,
        fiscalYear: dto.fiscalYear,
        casualLeave: dto.casualLeave,
        sickLeave: dto.sickLeave,
        earnedLeave: dto.earnedLeave,
        otherLeave: dto.otherLeave || 0,
        totalLeave: total,
        effectiveFrom: new Date(dto.effectiveFrom),
      },
      update: {
        casualLeave: dto.casualLeave,
        sickLeave: dto.sickLeave,
        earnedLeave: dto.earnedLeave,
        otherLeave: dto.otherLeave || 0,
        totalLeave: total,
        effectiveFrom: new Date(dto.effectiveFrom),
      },
    });
  }

  async deleteLeaveMaster(id: string) {
    return this.prisma.departmentLeaveMaster.delete({ where: { id } });
  }
}
