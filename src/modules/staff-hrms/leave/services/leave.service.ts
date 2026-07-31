import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRepository } from '../repositories/leave.repository';

@Injectable()
export class LeaveService {
  constructor(private readonly leaveRepository: LeaveRepository) { }

  async getHolidays() {
    return this.leaveRepository.findManyHolidays();
  }

  async createHoliday(dto: { name: string; date: string }) {
    return this.leaveRepository.createHoliday(dto);
  }

  async updateHoliday(id: string, dto: any) {
    return this.leaveRepository.updateHoliday(id, dto);
  }

  async deleteHoliday(id: string) {
    return this.leaveRepository.deleteHoliday(id);
  }

  async getLeaveApplications() {
    return this.leaveRepository.findManyLeaveApplications();
  }

  async applyLeave(dto: { employeeId: string; leaveType: string; startDate: string; endDate: string; reason: string }) {
    return this.leaveRepository.createLeaveApplication(dto);
  }

  async updateLeaveApplication(id: string, dto: any) {
    return this.leaveRepository.updateLeaveApplication(id, dto);
  }

  async deleteLeaveApplication(id: string) {
    return this.leaveRepository.deleteLeaveApplication(id);
  }

  async updateLeaveStatus(id: string, status: string) {
    const application = await this.leaveRepository.findLeaveApplication(id);
    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status === status) {
      return application;
    }

    const updatedApplication = await this.leaveRepository.updateLeaveStatus(id, status);

    if (status === 'APPROVED' && application.status !== 'APPROVED') {
      const days = Math.ceil((application.endDate.getTime() - application.startDate.getTime()) / (1000 * 3600 * 24)) + 1;
      const balance = await this.leaveRepository.findLeaveBalance(application.employeeId, application.leaveType);
      if (balance) {
        await this.leaveRepository.updateLeaveBalance(balance.id, balance.used + days);
        await this.leaveRepository.createLeaveLedger({
          employeeId: application.employeeId,
          leaveType: application.leaveType,
          change: -days,
          reason: `Approved Leave Application Ref: ${application.id}`,
        });
      }
    }

    if (status !== 'APPROVED' && application.status === 'APPROVED') {
      const days = Math.ceil((application.endDate.getTime() - application.startDate.getTime()) / (1000 * 3600 * 24)) + 1;
      const balance = await this.leaveRepository.findLeaveBalance(application.employeeId, application.leaveType);
      if (balance) {
        await this.leaveRepository.updateLeaveBalance(balance.id, Math.max(0, balance.used - days));
        await this.leaveRepository.createLeaveLedger({
          employeeId: application.employeeId,
          leaveType: application.leaveType,
          change: days,
          reason: `Reverted Leave Application Ref: ${application.id} (Status changed to ${status})`,
        });
      }
    }

    return updatedApplication;
  }

  // --- Department Leave Master ---
  async getLeaveMasters() {
    return this.leaveRepository.findManyLeaveMasters();
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
    return this.leaveRepository.createLeaveMaster(dto);
  }

  async deleteLeaveMaster(id: string) {
    return this.leaveRepository.deleteLeaveMaster(id);
  }
}
