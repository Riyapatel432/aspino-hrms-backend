import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyEmployees(
    query: PaginationQueryDto & { status?: string; department?: string } = {},
  ) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {};
    if (query.search) {
      where.OR = buildEmployeeSearchConditions(query.search);
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.department && query.department !== 'ALL') {
      where.department = query.department;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const findOptions: Prisma.EmployeeFindManyArgs = {
      where,
      include: {
        documents: true,
        induction: true,
        leaveBalances: true,
        systemAccess: true,
      },
      orderBy,
    };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany(findOptions),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page: isPaginated ? page : 1, limit: isPaginated ? limit : total };
  }

  async updateDocumentStatus(id: string, status: string) {
    return this.prisma.onboardingDocument.update({
      where: { id },
      data: { status, verifiedAt: status === 'VERIFIED' ? new Date() : null },
    });
  }

  async createInduction(dto: {
    employeeId: string;
    scheduledAt: string;
    trainer: string;
  }) {
    return this.prisma.inductionSchedule.create({
      data: {
        employeeId: dto.employeeId,
        scheduledAt: new Date(dto.scheduledAt),
        trainer: dto.trainer,
      },
    });
  }

  async updateInductionStatus(id: string, status: string) {
    return this.prisma.inductionSchedule.update({
      where: { id },
      data: { status },
    });
  }

  async updateProbation(id: string, status: string) {
    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        probationStatus: status,
        ...(status === 'CONFIRMED' ? { status: 'ACTIVE' } : {}),
      },
    });

    if (status === 'CONFIRMED') {
      // Allocate default leaves on confirmation
      await this.prisma.leaveBalance.createMany({
        data: [
          { employeeId: id, leaveType: 'Casual', allocated: 12, used: 0 },
          { employeeId: id, leaveType: 'Sick', allocated: 10, used: 0 },
          { employeeId: id, leaveType: 'Earned', allocated: 15, used: 0 },
        ],
      });

      // Allocate default salary structure
      const existingSalary = await this.prisma.salaryStructure.findFirst({
        where: { employeeId: id },
      });

      if (!existingSalary) {
        await this.prisma.salaryStructure.create({
          data: {
            employeeId: id,
            basicSalary: 0,
            hraAmount: 0,
            da: 0,
            conveyance: 0,
            specialAllowance: 0,
            statutoryBonus: 0,
            reimbursements: 0,
            grossSalary: 0,
            pfAmount: 0,
            esiAmount: 0,
            ptAmount: 0,
            taxRegime: 'NEW',
          },
        });
      }
    }

    return employee;
  }

  async upsertSystemAccess(
    employeeId: string,
    dto: {
      erpLogin: boolean;
      email: boolean;
      attendanceApp: boolean;
      vpn: boolean;
    },
  ) {
    return this.prisma.systemAccess.upsert({
      where: { employeeId },
      create: { employeeId, ...dto },
      update: dto,
    });
  }

  async updateDocumentFileUrl(id: string, fileUrl: string, status: string) {
    const doc = await this.prisma.onboardingDocument.findUnique({
      where: { id },
    });
    let finalUrl = fileUrl;
    if (
      doc &&
      (doc.documentType.startsWith('Education') ||
        doc.documentType.startsWith('Previous Employment'))
    ) {
      if (doc.fileUrl) {
        try {
          const list = doc.fileUrl.startsWith('[')
            ? JSON.parse(doc.fileUrl)
            : [doc.fileUrl];
          list.push(fileUrl);
          finalUrl = JSON.stringify(list);
        } catch (e) {
          finalUrl = JSON.stringify([doc.fileUrl, fileUrl]);
        }
      } else {
        finalUrl = JSON.stringify([fileUrl]);
      }
    }
    return this.prisma.onboardingDocument.update({
      where: { id },
      data: { fileUrl: finalUrl, status },
    });
  }

  async updateEmployee(id: string, data: any) {
    return this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  async deleteEmployee(id: string) {
    // Delete related records first to avoid foreign key constraint violations
    await this.prisma.onboardingDocument.deleteMany({
      where: { employeeId: id },
    });
    await this.prisma.inductionSchedule.deleteMany({
      where: { employeeId: id },
    });
    await this.prisma.systemAccess.deleteMany({ where: { employeeId: id } });
    await this.prisma.leaveBalance.deleteMany({ where: { employeeId: id } });
    await this.prisma.shiftRoster.deleteMany({ where: { employeeId: id } });
    await this.prisma.attendance.deleteMany({ where: { employeeId: id } });
    await this.prisma.leaveApplication.deleteMany({
      where: { employeeId: id },
    });
    await this.prisma.leaveLedger.deleteMany({ where: { employeeId: id } });
    await this.prisma.employeeGoal.deleteMany({ where: { employeeId: id } });
    await this.prisma.appraisalReview.deleteMany({ where: { employeeId: id } });
    await this.prisma.trainingRecord.deleteMany({ where: { employeeId: id } });

    // Check if exit process exists and delete it
    await this.prisma.clearanceTask.deleteMany({
      where: { exitProcess: { employeeId: id } },
    });
    await this.prisma.fullAndFinalSettlement.deleteMany({
      where: { exitProcess: { employeeId: id } },
    });
    await this.prisma.exitProcess.deleteMany({ where: { employeeId: id } });

    return this.prisma.employee.delete({ where: { id } });
  }
}
