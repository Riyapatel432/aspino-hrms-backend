import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, ExitType, ExitStatus, ClearanceStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

@Injectable()
export class ExitRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyExits(
    query: PaginationQueryDto & { status?: string; type?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ExitProcessWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      const searchUpper = query.search.toUpperCase().trim();
      const isValidType = Object.values(ExitType).includes(searchUpper as any);
      const isValidStatus = Object.values(ExitStatus).includes(searchUpper as any);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { reason: { contains: query.search, mode: 'insensitive' } },
        ...(isValidType ? [{ type: searchUpper as ExitType }] : []),
        ...(isValidStatus ? [{ status: searchUpper as ExitStatus }] : []),
      ];
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as ExitStatus;
    }
    if (query.type && query.type !== 'ALL') {
      where.type = query.type as ExitType;
    }

    const allowedExitSortFields = ['resignationDate', 'lastWorkingDay', 'type', 'status'];
    const orderBy: any = {};
    if (query.sortBy && allowedExitSortFields.includes(query.sortBy)) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.resignationDate = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.exitProcess.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            include: { leaveBalances: true },
          },
          clearances: true,
          settlement: true,
        },
        orderBy,
      }),
      this.prisma.exitProcess.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async initiateExit(dto: {
    employeeId: string;
    type: string;
    resignationDate: string;
    noticePeriodDays: number;
    lastWorkingDay: string;
    reason: string;
  }) {
    const exit = await this.prisma.exitProcess.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type as ExitType,
        resignationDate: new Date(dto.resignationDate),
        noticePeriodDays: dto.noticePeriodDays,
        lastWorkingDay: new Date(dto.lastWorkingDay),
        reason: dto.reason,
        status: 'CLEARANCE_IN_PROGRESS',
      },
    });

    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { status: 'EXITING' },
    });

    // Create departmental clearances for IT, Finance, Admin, HR, Store, Library, Security
    const departments = [
      'IT',
      'Finance',
      'Admin',
      'HR',
      'Store',
      'Library',
      'Security',
    ];
    const tasksData: any[] = [];
    for (const name of departments) {
      let dept = await this.prisma.department.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (!dept) {
        dept = await this.prisma.department.create({
          data: { name },
        });
      }
      tasksData.push({
        exitProcessId: exit.id,
        departmentId: dept.id,
        taskDescription: `Complete ${name} assets and dues clearance checklist.`,
        status: 'PENDING',
      });
    }
    await this.prisma.clearanceTask.createMany({
      data: tasksData,
    });

    return exit;
  }

  async updateClearance(id: string, status: string, clearedBy?: string) {
    return this.prisma.clearanceTask.update({
      where: { id },
      data: {
        status: status as ClearanceStatus,
        clearedAt: status === 'CLEARED' ? new Date() : null,
        clearedBy: status === 'CLEARED' ? clearedBy : null,
      },
    });
  }

  async processSettlement(dto: {
    exitProcessId: string;
    pendingSalary: number;
    leaveEncashment: number;
    bonus: number;
    recoveries: number;
  }) {
    const netPayable =
      dto.pendingSalary + dto.leaveEncashment + dto.bonus - dto.recoveries;

    const settlement = await this.prisma.fullAndFinalSettlement.upsert({
      where: { exitProcessId: dto.exitProcessId },
      create: {
        exitProcessId: dto.exitProcessId,
        pendingSalary: dto.pendingSalary,
        leaveEncashment: dto.leaveEncashment,
        bonus: dto.bonus,
        recoveries: dto.recoveries,
        netPayable,
      },
      update: {
        pendingSalary: dto.pendingSalary,
        leaveEncashment: dto.leaveEncashment,
        bonus: dto.bonus,
        recoveries: dto.recoveries,
        netPayable,
      },
    });

    await this.prisma.exitProcess.update({
      where: { id: dto.exitProcessId },
      data: { status: 'SETTLED' },
    });

    return settlement;
  }

  async completeExit(id: string) {
    const exit = await this.prisma.exitProcess.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await this.prisma.employee.update({
      where: { id: exit.employeeId },
      data: { status: 'RELIEVED' },
    });

    return exit;
  }

  async updateExit(
    id: string,
    dto: {
      employeeId?: string;
      type?: string;
      resignationDate?: string;
      noticePeriodDays?: number;
      lastWorkingDay?: string;
      reason?: string;
    },
  ) {
    const { employeeId, ...rest } = dto;
    const data: any = { ...rest };
    if (dto.resignationDate)
      data.resignationDate = new Date(dto.resignationDate);
    if (dto.lastWorkingDay) data.lastWorkingDay = new Date(dto.lastWorkingDay);
    if (dto.noticePeriodDays !== undefined && dto.noticePeriodDays !== null) {
      data.noticePeriodDays = Number(dto.noticePeriodDays);
    }

    return this.prisma.exitProcess.update({
      where: { id },
      data,
    });
  }

  async deleteExit(id: string) {
    // Delete related clearances and settlements first
    await this.prisma.clearanceTask.deleteMany({
      where: { exitProcessId: id },
    });
    await this.prisma.fullAndFinalSettlement.deleteMany({
      where: { exitProcessId: id },
    });

    const exit = await this.prisma.exitProcess.delete({ where: { id } });

    // Reset employee status
    await this.prisma.employee.update({
      where: { id: exit.employeeId },
      data: { status: 'ACTIVE' },
    });

    return exit;
  }
}
