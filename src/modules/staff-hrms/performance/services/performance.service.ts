import { Injectable, ConflictException } from '@nestjs/common';
import { PerformanceRepository } from '../repositories/performance.repository';
import { PrismaService } from '../../../../prisma/prisma.service';

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

  async getAppraisalCycles() {
    return this.performanceRepository.findManyCycles();
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

  async getGoals() {
    return this.performanceRepository.findManyGoals();
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

  async getReviews() {
    return this.performanceRepository.findManyReviews();
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
