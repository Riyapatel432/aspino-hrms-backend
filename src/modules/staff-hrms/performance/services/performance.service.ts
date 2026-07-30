import { Injectable } from '@nestjs/common';
import { PerformanceRepository } from '../repositories/performance.repository';

@Injectable()
export class PerformanceService {
  constructor(private readonly performanceRepository: PerformanceRepository) {}

  async getAppraisalCycles() {
    return this.performanceRepository.findManyCycles();
  }

  async createAppraisalCycle(dto: { name: string; startDate: string; endDate: string }) {
    return this.performanceRepository.createCycle(dto);
  }

  async updateAppraisalCycle(id: string, dto: any) {
    return this.performanceRepository.updateCycle(id, dto);
  }

  async deleteAppraisalCycle(id: string) {
    return this.performanceRepository.deleteCycle(id);
  }

  async getGoals() {
    return this.performanceRepository.findManyGoals();
  }

  async createGoal(dto: { employeeId: string; cycleId: string; title: string; description: string; weightage: number }) {
    return this.performanceRepository.createGoal(dto);
  }

  async updateGoal(id: string, dto: any) {
    return this.performanceRepository.updateGoal(id, dto);
  }

  async deleteGoal(id: string) {
    return this.performanceRepository.deleteGoal(id);
  }

  async getReviews() {
    return this.performanceRepository.findManyReviews();
  }

  async createOrUpdateReview(dto: { employeeId: string; cycleId: string; selfRating?: number; selfComments?: string; managerRating?: number; managerComments?: string; finalRating?: number; status: string }) {
    return this.performanceRepository.upsertReview(dto);
  }

  async updateReview(id: string, dto: any) {
    return this.performanceRepository.updateReview(id, dto);
  }

  async deleteReview(id: string) {
    return this.performanceRepository.deleteReview(id);
  }
}
