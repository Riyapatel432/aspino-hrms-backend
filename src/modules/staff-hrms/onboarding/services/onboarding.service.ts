import { Injectable } from '@nestjs/common';
import { OnboardingRepository } from '../repositories/onboarding.repository';

@Injectable()
export class OnboardingService {
  constructor(private readonly onboardingRepository: OnboardingRepository) { }

  async getEmployees(page: number, limit: number, search?: string, status?: string) {
    return this.onboardingRepository.findManyEmployees(page, limit, search, status);
  }

  async updateDocumentStatus(id: string, status: string) {
    return this.onboardingRepository.updateDocumentStatus(id, status);
  }

  async createInduction(dto: { employeeId: string; scheduledAt: string; trainer: string }) {
    return this.onboardingRepository.createInduction(dto);
  }

  async updateInductionStatus(id: string, status: string) {
    return this.onboardingRepository.updateInductionStatus(id, status);
  }

  async updateProbation(id: string, status: string) {
    return this.onboardingRepository.updateProbation(id, status);
  }

  async updateSystemAccess(employeeId: string, dto: { erpLogin: boolean; email: boolean; attendanceApp: boolean; vpn: boolean }) {
    return this.onboardingRepository.upsertSystemAccess(employeeId, dto);
  }

  async updateDocumentFileUrl(id: string, fileUrl: string, status: string) {
    return this.onboardingRepository.updateDocumentFileUrl(id, fileUrl, status);
  }

  async updateEmployee(id: string, data: any) {
    return this.onboardingRepository.updateEmployee(id, data);
  }

  async deleteEmployee(id: string) {
    return this.onboardingRepository.deleteEmployee(id);
  }
}
