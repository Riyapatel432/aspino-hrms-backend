import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../../common/utils/search.util';

@Injectable()
export class LeaveRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyHolidays(query: PaginationQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.HolidayWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
    } else {
      orderBy.date = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.holiday.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.holiday.count({ where }),
    ]);

    return { data, total, page, limit };
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

  async findManyLeaveApplications(
    query: PaginationQueryDto & { employeeId?: string; status?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveApplicationWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { leaveType: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { status: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const allowedSortFields = ['startDate', 'endDate', 'leaveType', 'status'];
    const orderBy: any = {};
    if (query.sortBy && allowedSortFields.includes(query.sortBy)) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.startDate = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.leaveApplication.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy,
      }),
      this.prisma.leaveApplication.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createLeaveApplication(dto: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    return this.prisma.leaveApplication.create({
      data: {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
      include: { employee: true },
    });
  }

  async updateLeaveApplication(id: string, dto: any) {
    if (dto.startDate) dto.startDate = new Date(dto.startDate);
    if (dto.endDate) dto.endDate = new Date(dto.endDate);
    return this.prisma.leaveApplication.update({
      where: { id },
      data: dto,
      include: { employee: true },
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

  async createLeaveLedger(dto: {
    employeeId: string;
    leaveType: string;
    change: number;
    reason: string;
  }) {
    return this.prisma.leaveLedger.create({
      data: dto,
    });
  }

  // --- Department Leave Master ---
  async findManyLeaveMasters(
    query: PaginationQueryDto & { department?: string; fiscalYear?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentLeaveMasterWhereInput = {};
    if (query.search) {
      where.OR = [
        { department: { contains: query.search, mode: 'insensitive' } },
        { fiscalYear: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.department && query.department !== 'ALL') {
      where.department = query.department;
    }
    if (query.fiscalYear) {
      where.fiscalYear = query.fiscalYear;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
    } else {
      orderBy.department = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.departmentLeaveMaster.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.departmentLeaveMaster.count({ where }),
    ]);

    return { data, total, page, limit };
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
    const total =
      dto.casualLeave + dto.sickLeave + dto.earnedLeave + (dto.otherLeave || 0);
    return this.prisma.departmentLeaveMaster.upsert({
      where: {
        department_fiscalYear: {
          department: dto.department,
          fiscalYear: dto.fiscalYear,
        },
      },
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
