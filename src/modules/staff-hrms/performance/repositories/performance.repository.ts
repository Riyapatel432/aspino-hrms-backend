import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PerformanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyCycles() {
    return this.prisma.appraisalCycle.findMany({
      include: { goals: true, appraisalReviews: true },
    });
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

  async findManyGoals() {
    return this.prisma.employeeGoal.findMany({
      include: { employee: true, cycle: true },
    });
  }

  async createGoal(dto: { employeeId: string; cycleId: string; title: string; description: string; weightage: number }) {
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

  async findManyReviews() {
    return this.prisma.appraisalReview.findMany({
      include: { employee: true, cycle: true },
    });
  }

  async upsertReview(dto: { employeeId: string; cycleId: string; selfRating?: number; selfComments?: string; managerRating?: number; managerComments?: string; finalRating?: number; status: string }) {
    const existing = await this.prisma.appraisalReview.findFirst({
      where: { employeeId: dto.employeeId, cycleId: dto.cycleId },
    });

    const updateData: any = { status: dto.status };
    if (dto.selfRating !== undefined) updateData.selfRating = dto.selfRating;
    if (dto.selfComments !== undefined) updateData.selfComments = dto.selfComments;
    if (dto.managerRating !== undefined) updateData.managerRating = dto.managerRating;
    if (dto.managerComments !== undefined) updateData.managerComments = dto.managerComments;
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
