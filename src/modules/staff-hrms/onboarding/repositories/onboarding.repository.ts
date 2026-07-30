import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyEmployees(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [data, totalCount] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: { documents: true, induction: true, leaveBalances: true, systemAccess: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async updateDocumentStatus(id: string, status: string) {
    return this.prisma.onboardingDocument.update({
      where: { id },
      data: { status, verifiedAt: status === 'VERIFIED' ? new Date() : null },
    });
  }

  async createInduction(dto: { employeeId: string; scheduledAt: string; trainer: string }) {
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
      data: { probationStatus: status },
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
    }

    return employee;
  }

  async upsertSystemAccess(employeeId: string, dto: { erpLogin: boolean; email: boolean; attendanceApp: boolean; vpn: boolean }) {
    return this.prisma.systemAccess.upsert({
      where: { employeeId },
      create: { employeeId, ...dto },
      update: dto,
    });
  }

  async updateDocumentFileUrl(id: string, fileUrl: string, status: string) {
    const doc = await this.prisma.onboardingDocument.findUnique({ where: { id } });
    let finalUrl = fileUrl;
    if (doc && (doc.documentType.startsWith('Education') || doc.documentType.startsWith('Previous Employment'))) {
      if (doc.fileUrl) {
        try {
          const list = doc.fileUrl.startsWith('[') ? JSON.parse(doc.fileUrl) : [doc.fileUrl];
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
    // Delete related records first
    await this.prisma.onboardingDocument.deleteMany({ where: { employeeId: id } });
    await this.prisma.inductionSchedule.deleteMany({ where: { employeeId: id } });
    await this.prisma.systemAccess.deleteMany({ where: { employeeId: id } });
    await this.prisma.leaveBalance.deleteMany({ where: { employeeId: id } });
    return this.prisma.employee.delete({ where: { id } });
  }
}
