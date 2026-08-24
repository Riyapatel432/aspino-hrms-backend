import { Injectable, ConflictException } from '@nestjs/common';
import { OnboardingRepository } from '../repositories/onboarding.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getEmployees(
    query: PaginationQueryDto & { status?: string; department?: string } = {},
  ) {
    const res = await this.onboardingRepository.findManyEmployees(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async getBanks() {
    return this.prisma.bank.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateDocumentStatus(id: string, status: string) {
    return this.onboardingRepository.updateDocumentStatus(id, status);
  }

  async createInduction(dto: {
    employeeId: string;
    scheduledAt: string;
    trainer: string;
  }) {
    const existing = await this.prisma.inductionSchedule.findUnique({
      where: { employeeId: dto.employeeId },
    });
    if (existing) {
      throw new ConflictException(
        'Induction schedule already exists for this employee.',
      );
    }
    return this.onboardingRepository.createInduction(dto);
  }

  async updateInductionStatus(id: string, status: string) {
    return this.onboardingRepository.updateInductionStatus(id, status);
  }

  async updateProbation(id: string, status: string) {
    return this.onboardingRepository.updateProbation(id, status);
  }

  async updateSystemAccess(
    employeeId: string,
    dto: {
      erpLogin: boolean;
      email: boolean;
      attendanceApp: boolean;
      vpn: boolean;
    },
  ) {
    return this.onboardingRepository.upsertSystemAccess(employeeId, dto);
  }

  async updateDocumentFileUrl(id: string, fileUrl: string, status: string) {
    return this.onboardingRepository.updateDocumentFileUrl(id, fileUrl, status);
  }

  async updateEmployee(id: string, data: Prisma.EmployeeUpdateInput) {
    if (data.email) {
      const emailStr =
        typeof data.email === 'string' ? data.email : data.email.set;
      if (emailStr) {
        const existing = await this.prisma.employee.findFirst({
          where: {
            email: emailStr,
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            'Employee with this email already exists.',
          );
        }
      }
    }
    if (data.employeeId) {
      const empIdStr =
        typeof data.employeeId === 'string'
          ? data.employeeId
          : data.employeeId.set;
      if (empIdStr) {
        const existing = await this.prisma.employee.findFirst({
          where: {
            employeeId: empIdStr,
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            'Employee with this employee ID already exists.',
          );
        }
      }
    }
    return this.onboardingRepository.updateEmployee(id, data);
  }

  async deleteEmployee(id: string) {
    return this.onboardingRepository.deleteEmployee(id);
  }
}
