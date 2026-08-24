import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, LeaveStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

@Injectable()
export class LeaveRepository {
  constructor(private readonly prisma: PrismaService) {}

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
      const searchUpper = query.search.toUpperCase().trim();
      const isValidStatus = Object.values(LeaveStatus).includes(
        searchUpper as any,
      );
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { leaveType: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        ...(isValidStatus ? [{ status: searchUpper as LeaveStatus }] : []),
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as LeaveStatus;
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
      data: { status: status as LeaveStatus },
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
    query: PaginationQueryDto & {
      department?: string;
      fiscalYear?: string;
    } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentLeaveMasterWhereInput = {};
    if (query.search) {
      where.OR = [
        {
          department: { name: { contains: query.search, mode: 'insensitive' } },
        },
        {
          fiscalYear: { name: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }
    if (query.department && query.department !== 'ALL') {
      where.departmentId = query.department;
    }
    if (query.fiscalYear) {
      where.fiscalYearId = query.fiscalYear;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      if (query.sortBy === 'department') {
        orderBy.department = { name: (query.sortOrder || 'asc').toLowerCase() };
      } else if (query.sortBy === 'fiscalYear') {
        orderBy.fiscalYear = { name: (query.sortOrder || 'asc').toLowerCase() };
      } else {
        orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
      }
    } else {
      orderBy.departmentId = 'asc';
    }

    let data: any[] = [];
    let total = 0;
    try {
      const res = await Promise.all([
        this.prisma.departmentLeaveMaster.findMany({
          where,
          skip,
          take: limit,
          include: {
            department: true,
            fiscalYear: true,
          },
          orderBy,
        }),
        this.prisma.departmentLeaveMaster.count({ where }),
      ]);
      data = res[0];
      total = res[1];
    } catch (e) {}

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
        departmentId_fiscalYearId: {
          departmentId: dto.department,
          fiscalYearId: dto.fiscalYear,
        },
      },
      create: {
        departmentId: dto.department,
        fiscalYearId: dto.fiscalYear,
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

  async updateLeaveMaster(id: string, data: any) {
    const updateData: any = {};
    if (data.department !== undefined)
      updateData.departmentId = data.department;
    if (data.fiscalYear !== undefined)
      updateData.fiscalYearId = data.fiscalYear;
    if (data.casualLeave !== undefined)
      updateData.casualLeave = Number(data.casualLeave);
    if (data.sickLeave !== undefined)
      updateData.sickLeave = Number(data.sickLeave);
    if (data.earnedLeave !== undefined)
      updateData.earnedLeave = Number(data.earnedLeave);
    if (data.otherLeave !== undefined)
      updateData.otherLeave = Number(data.otherLeave);
    if (data.effectiveFrom !== undefined)
      updateData.effectiveFrom = new Date(data.effectiveFrom);
    if (data.isActive !== undefined)
      updateData.isActive = Boolean(data.isActive);

    if (
      data.casualLeave !== undefined ||
      data.sickLeave !== undefined ||
      data.earnedLeave !== undefined ||
      data.otherLeave !== undefined
    ) {
      const existing = await this.prisma.departmentLeaveMaster.findUnique({
        where: { id },
      });
      if (existing) {
        const casual =
          data.casualLeave !== undefined
            ? Number(data.casualLeave)
            : existing.casualLeave;
        const sick =
          data.sickLeave !== undefined
            ? Number(data.sickLeave)
            : existing.sickLeave;
        const earned =
          data.earnedLeave !== undefined
            ? Number(data.earnedLeave)
            : existing.earnedLeave;
        const other =
          data.otherLeave !== undefined
            ? Number(data.otherLeave)
            : existing.otherLeave;
        updateData.totalLeave = casual + sick + earned + other;
      }
    }
    return this.prisma.departmentLeaveMaster.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteLeaveMaster(id: string) {
    return this.prisma.departmentLeaveMaster.delete({ where: { id } });
  }
}
