import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { LeaveRepository } from '../repositories/leave.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

export interface UpdateHolidayDto {
  name?: string;
  date?: string;
}

export interface UpdateLeaveApplicationDto {
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: string;
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly leaveRepository: LeaveRepository,
    private readonly prisma: PrismaService,
  ) { }

  async getHolidays(query: PaginationQueryDto = {}) {
    const res = await this.leaveRepository.findManyHolidays(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createHoliday(dto: { name: string; date: string }) {
    const targetDate = new Date(dto.date);
    const existing = await this.prisma.holiday.findFirst({
      where: { date: targetDate },
    });
    if (existing) {
      throw new ConflictException(
        'A holiday is already scheduled on this date.',
      );
    }
    return this.leaveRepository.createHoliday(dto);
  }

  async updateHoliday(id: string, dto: UpdateHolidayDto) {
    if (dto.date) {
      const targetDate = new Date(dto.date);
      const existing = await this.prisma.holiday.findFirst({
        where: {
          date: targetDate,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          'A holiday is already scheduled on this date.',
        );
      }
    }
    return this.leaveRepository.updateHoliday(id, dto);
  }

  async deleteHoliday(id: string) {
    return this.leaveRepository.deleteHoliday(id);
  }

  async getLeaveApplications(query: PaginationQueryDto & { employeeId?: string; status?: string } = {}) {
    const res = await this.leaveRepository.findManyLeaveApplications(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async applyLeave(dto: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    return this.leaveRepository.createLeaveApplication(dto);
  }

  async updateLeaveApplication(id: string, dto: UpdateLeaveApplicationDto) {
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

    const updatedApplication = await this.leaveRepository.updateLeaveStatus(
      id,
      status,
    );

    if (status === 'APPROVED' && application.status !== 'APPROVED') {
      const days =
        Math.ceil(
          (application.endDate.getTime() - application.startDate.getTime()) /
          (1000 * 3600 * 24),
        ) + 1;
      const balance = await this.leaveRepository.findLeaveBalance(
        application.employeeId,
        application.leaveType,
      );
      if (balance) {
        await this.leaveRepository.updateLeaveBalance(
          balance.id,
          balance.used + days,
        );
        await this.leaveRepository.createLeaveLedger({
          employeeId: application.employeeId,
          leaveType: application.leaveType,
          change: -days,
          reason: `Approved Leave Application Ref: ${application.id}`,
        });
      }
    }

    if (status !== 'APPROVED' && application.status === 'APPROVED') {
      const days =
        Math.ceil(
          (application.endDate.getTime() - application.startDate.getTime()) /
          (1000 * 3600 * 24),
        ) + 1;
      const balance = await this.leaveRepository.findLeaveBalance(
        application.employeeId,
        application.leaveType,
      );
      if (balance) {
        await this.leaveRepository.updateLeaveBalance(
          balance.id,
          Math.max(0, balance.used - days),
        );
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
  async getLeaveMasters(query: PaginationQueryDto & { department?: string; fiscalYear?: string } = {}) {
    const res = await this.leaveRepository.findManyLeaveMasters(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
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
    const existing = await this.prisma.departmentLeaveMaster.findFirst({
      where: {
        department: { equals: dto.department, mode: 'insensitive' },
        fiscalYear: { equals: dto.fiscalYear, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new ConflictException(`Leave master for department "${dto.department}" and fiscal year "${dto.fiscalYear}" already exists.`);
    }
    return this.leaveRepository.createLeaveMaster(dto);
  }

  async updateLeaveMaster(id: string, data: any) {
    return this.leaveRepository.updateLeaveMaster(id, data);
  }

  async deleteLeaveMaster(id: string) {
    try {
      return await this.leaveRepository.deleteLeaveMaster(id);
    } catch (error) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new ConflictException(
          'This Leave Master record is currently in use and cannot be deleted.'
        );
      }
      throw error;
    }
  }
}
