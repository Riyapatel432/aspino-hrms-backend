import { Injectable } from '@nestjs/common';
import { ExitRepository } from '../repositories/exit.repository';

@Injectable()
export class ExitService {
  constructor(private readonly exitRepository: ExitRepository) {}

  async getExits() {
    return this.exitRepository.findManyExits();
  }

  async initiateExit(dto: { employeeId: string; type: string; resignationDate: string; noticePeriodDays: number; lastWorkingDay: string; reason: string }) {
    return this.exitRepository.initiateExit(dto);
  }

  async updateClearance(id: string, status: string, clearedBy?: string) {
    return this.exitRepository.updateClearance(id, status, clearedBy);
  }

  async processSettlement(dto: { exitProcessId: string; pendingSalary: number; leaveEncashment: number; bonus: number; recoveries: number }) {
    return this.exitRepository.processSettlement(dto);
  }

  async completeExit(id: string) {
    return this.exitRepository.completeExit(id);
  }

  async updateExit(id: string, dto: { type?: string; resignationDate?: string; noticePeriodDays?: number; lastWorkingDay?: string; reason?: string }) {
    return this.exitRepository.updateExit(id, dto);
  }

  async deleteExit(id: string) {
    return this.exitRepository.deleteExit(id);
  }
}
