import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

@Injectable()
export class PerformanceRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyCycles(query: PaginationQueryDto & { status?: string } = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AppraisalCycleWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { status: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const allowedCycleSortFields = ['name', 'startDate', 'endDate', 'status'];
    const orderBy: any = {};
    if (query.sortBy && allowedCycleSortFields.includes(query.sortBy)) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.startDate = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.appraisalCycle.findMany({
        where,
        skip,
        take: limit,
        include: { goals: true, appraisalReviews: true },
        orderBy,
      }),
      this.prisma.appraisalCycle.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createCycle(dto: { name: string; startDate: string; endDate: string }) {
    return this.prisma.appraisalCycle.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async updateCycle(id: string, dto: any) {
    if (dto.startDate) dto.startDate = new Date(dto.startDate);
    if (dto.endDate) dto.endDate = new Date(dto.endDate);
    return this.prisma.appraisalCycle.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCycle(id: string) {
    return this.prisma.appraisalCycle.delete({ where: { id } });
  }

  async findManyGoals(
    query: PaginationQueryDto & { employeeId?: string; cycleId?: string; status?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeGoalWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { cycle: { name: { contains: query.search, mode: 'insensitive' } } },
        { status: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.cycleId) {
      where.cycleId = query.cycleId;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const allowedGoalSortFields = ['title', 'weightage', 'status'];
    const orderBy: any = {};
    if (query.sortBy && allowedGoalSortFields.includes(query.sortBy)) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.title = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.employeeGoal.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true, cycle: true },
        orderBy,
      }),
      this.prisma.employeeGoal.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createGoal(dto: {
    employeeId: string;
    cycleId: string;
    title: string;
    description: string;
    weightage: number;
  }) {
    return this.prisma.employeeGoal.create({
      data: {
        employeeId: dto.employeeId,
        cycleId: dto.cycleId,
        title: dto.title,
        description: dto.description,
        weightage: dto.weightage,
      },
    });
  }

  async updateGoal(id: string, dto: any) {
    return this.prisma.employeeGoal.update({
      where: { id },
      data: dto,
    });
  }

  async deleteGoal(id: string) {
    return this.prisma.employeeGoal.delete({ where: { id } });
  }

  async findManyReviews(
    query: PaginationQueryDto & { employeeId?: string; cycleId?: string; status?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AppraisalReviewWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { cycle: { name: { contains: query.search, mode: 'insensitive' } } },
        { selfComments: { contains: query.search, mode: 'insensitive' } },
        { managerComments: { contains: query.search, mode: 'insensitive' } },
        { status: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.cycleId) {
      where.cycleId = query.cycleId;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const allowedReviewSortFields = ['selfRating', 'managerRating', 'finalRating', 'status'];
    const orderBy: any = {};
    if (query.sortBy && allowedReviewSortFields.includes(query.sortBy)) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.status = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.appraisalReview.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true, cycle: true },
        orderBy,
      }),
      this.prisma.appraisalReview.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async upsertReview(dto: {
    employeeId: string;
    cycleId: string;
    selfRating?: number;
    selfComments?: string;
    managerRating?: number;
    managerComments?: string;
    finalRating?: number;
    status: string;
  }) {
    const existing = await this.prisma.appraisalReview.findFirst({
      where: { employeeId: dto.employeeId, cycleId: dto.cycleId },
    });

    const updateData: any = { status: dto.status };
    if (dto.selfRating !== undefined) updateData.selfRating = dto.selfRating;
    if (dto.selfComments !== undefined)
      updateData.selfComments = dto.selfComments;
    if (dto.managerRating !== undefined)
      updateData.managerRating = dto.managerRating;
    if (dto.managerComments !== undefined)
      updateData.managerComments = dto.managerComments;
    if (dto.finalRating !== undefined) updateData.finalRating = dto.finalRating;

    if (existing) {
      return this.prisma.appraisalReview.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      return this.prisma.appraisalReview.create({
        data: {
          employeeId: dto.employeeId,
          cycleId: dto.cycleId,
          ...updateData,
        },
      });
    }
  }

  async updateReview(id: string, dto: any) {
    return this.prisma.appraisalReview.update({
      where: { id },
      data: dto,
    });
  }

  async deleteReview(id: string) {
    return this.prisma.appraisalReview.delete({ where: { id } });
  }
}
