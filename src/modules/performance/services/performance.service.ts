import { Injectable, ConflictException } from '@nestjs/common';
import { PerformanceRepository } from '../repositories/performance.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

export interface UpdateCycleDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface UpdateGoalDto {
  title?: string;
  description?: string;
  weightage?: number;
  status?: string;
}

export interface UpdateReviewDto {
  selfRating?: number;
  selfComments?: string;
  managerRating?: number;
  managerComments?: string;
  finalRating?: number;
  status?: string;
}

@Injectable()
export class PerformanceService {
  constructor(
    private readonly performanceRepository: PerformanceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getAppraisalCycles(
    query: PaginationQueryDto & { status?: string } = {},
  ) {
    const res = await this.performanceRepository.findManyCycles(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createAppraisalCycle(dto: {
    name: string;
    startDate: string;
    endDate: string;
  }) {
    const existing = await this.prisma.appraisalCycle.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(
        'An appraisal cycle with this name already exists.',
      );
    }
    return this.performanceRepository.createCycle(dto);
  }

  async updateAppraisalCycle(id: string, dto: UpdateCycleDto) {
    if (dto.name) {
      const existing = await this.prisma.appraisalCycle.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          'An appraisal cycle with this name already exists.',
        );
      }
    }
    return this.performanceRepository.updateCycle(id, dto);
  }

  async deleteAppraisalCycle(id: string) {
    return this.performanceRepository.deleteCycle(id);
  }

  async getGoals(
    query: PaginationQueryDto & {
      employeeId?: string;
      cycleId?: string;
      status?: string;
    } = {},
  ) {
    const res = await this.performanceRepository.findManyGoals(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createGoal(dto: {
    employeeId: string;
    cycleId: string;
    title: string;
    description: string;
    weightage: number;
  }) {
    return this.performanceRepository.createGoal(dto);
  }

  async updateGoal(id: string, dto: UpdateGoalDto) {
    return this.performanceRepository.updateGoal(id, dto);
  }

  async deleteGoal(id: string) {
    return this.performanceRepository.deleteGoal(id);
  }

  async getReviews(
    query: PaginationQueryDto & {
      employeeId?: string;
      cycleId?: string;
      status?: string;
    } = {},
  ) {
    const res = await this.performanceRepository.findManyReviews(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createOrUpdateReview(dto: {
    employeeId: string;
    cycleId: string;
    selfRating?: number;
    selfComments?: string;
    managerRating?: number;
    managerComments?: string;
    finalRating?: number;
    status: string;
  }) {
    return this.performanceRepository.upsertReview(dto);
  }

  async updateReview(id: string, dto: UpdateReviewDto) {
    return this.performanceRepository.updateReview(id, dto);
  }

  async deleteReview(id: string) {
    return this.performanceRepository.deleteReview(id);
  }
}
