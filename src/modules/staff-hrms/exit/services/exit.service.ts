import { Injectable, ConflictException } from '@nestjs/common';
import { ExitRepository } from '../repositories/exit.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../../common/utils/pagination.util';

@Injectable()
export class ExitService {
  constructor(
    private readonly exitRepository: ExitRepository,
    private readonly prisma: PrismaService,
  ) { }

  async getExits(query: PaginationQueryDto & { status?: string; type?: string } = {}) {
    const res = await this.exitRepository.findManyExits(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async initiateExit(dto: {
    employeeId: string;
    type: string;
    resignationDate: string;
    noticePeriodDays: number;
    lastWorkingDay: string;
    reason: string;
  }) {
    const existing = await this.prisma.exitProcess.findUnique({
      where: { employeeId: dto.employeeId },
    });
    if (existing) {
      throw new ConflictException(
        'An exit process has already been initiated for this employee.',
      );
    }
    return this.exitRepository.initiateExit(dto);
  }

  async updateClearance(id: string, status: string, clearedBy?: string) {
    return this.exitRepository.updateClearance(id, status, clearedBy);
  }

  async processSettlement(dto: {
    exitProcessId: string;
    pendingSalary: number;
    leaveEncashment: number;
    bonus: number;
    recoveries: number;
  }) {
    return this.exitRepository.processSettlement(dto);
  }

  async completeExit(id: string) {
    return this.exitRepository.completeExit(id);
  }

  async updateExit(
    id: string,
    dto: {
      type?: string;
      resignationDate?: string;
      noticePeriodDays?: number;
      lastWorkingDay?: string;
      reason?: string;
    },
  ) {
    return this.exitRepository.updateExit(id, dto);
  }

  async deleteExit(id: string) {
    return this.exitRepository.deleteExit(id);
  }
}
