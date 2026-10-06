import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  Prisma,
  EmployeeStatus,
  DocumentStatus,
  InductionStatus,
  ProbationStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

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
      const s = String(query.status).trim().toUpperCase();
      if (s === 'PROBATION' || s === 'UNDER_REVIEW') {
        where.probationStatus = 'UNDER_REVIEW';
      } else if (s === 'CONFIRMED' || s === 'EXTENDED') {
        where.probationStatus = s as any;
      } else if (['ONBOARDING', 'ACTIVE', 'EXITING', 'RELIEVED'].includes(s)) {
        where.status = s as EmployeeStatus;
      }
    }
    if (query.department && query.department !== 'ALL') {
      where.departmentId = query.department;
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
        department: true,
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

    return {
      data,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async updateDocumentStatus(id: string, status: string) {
    return this.prisma.onboardingDocument.update({
      where: { id },
      data: {
        status: status as DocumentStatus,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
      },
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
      data: { status: status as InductionStatus },
    });
  }

  async updateProbation(id: string, status: string) {
    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        probationStatus: status as ProbationStatus,
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
      data: { fileUrl: finalUrl, status: status as DocumentStatus },
    });
  }

  async updateEmployee(id: string, data: any) {
    const { systemAccess, photoUrl, ...empData } = data;

    if (empData.employeeId) {
      empData.employeeId = empData.employeeId.trim().toUpperCase();
    }
    if (empData.dob !== undefined) {
      empData.dob = empData.dob ? new Date(empData.dob) : null;
    }
    if (empData.dateOfJoining) {
      empData.dateOfJoining = new Date(empData.dateOfJoining);
    }
    if (empData.probationEnd !== undefined) {
      empData.probationEnd = empData.probationEnd ? new Date(empData.probationEnd) : null;
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: empData,
    });

    if (systemAccess) {
      await this.upsertSystemAccess(id, {
        erpLogin: Boolean(systemAccess.erpLogin),
        email: Boolean(systemAccess.email),
        attendanceApp: Boolean(systemAccess.attendanceApp),
        vpn: Boolean(systemAccess.vpn),
      });
    }

    if (photoUrl) {
      const photoDoc = await this.prisma.onboardingDocument.findFirst({
        where: { employeeId: id, documentType: 'Photo' },
      });
      if (photoDoc) {
        await this.prisma.onboardingDocument.update({
          where: { id: photoDoc.id },
          data: { fileUrl: photoUrl, status: 'VERIFIED', verifiedAt: new Date() },
        });
      } else {
        await this.prisma.onboardingDocument.create({
          data: {
            employeeId: id,
            documentType: 'Photo',
            fileUrl: photoUrl,
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });
      }
    }

    const resUrl = data.resumeUrl || empData.resumeUrl;
    if (resUrl) {
      const resumeDoc = await this.prisma.onboardingDocument.findFirst({
        where: { employeeId: id, documentType: 'Resume / CV' },
      });
      if (resumeDoc) {
        await this.prisma.onboardingDocument.update({
          where: { id: resumeDoc.id },
          data: { fileUrl: resUrl, status: 'VERIFIED', verifiedAt: new Date() },
        });
      } else {
        await this.prisma.onboardingDocument.create({
          data: {
            employeeId: id,
            documentType: 'Resume / CV',
            fileUrl: resUrl,
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });
      }
    }

    return this.findEmployeeById(id);
  }

  async findEmployeeById(id: string) {
    return this.prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeId: id }],
      },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        documents: true,
        induction: true,
        leaveBalances: true,
        systemAccess: true,
        bank: true,
        salaryStructures: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getNextEmployeeId() {
    const currentYear = new Date().getFullYear();
    const prefix = `ASP-${currentYear}-`;

    const employees = await this.prisma.employee.findMany({
      where: {
        employeeId: {
          startsWith: prefix,
        },
      },
      select: { employeeId: true },
    });

    let maxNumber = 0;
    for (const emp of employees) {
      if (!emp.employeeId) continue;
      const suffix = emp.employeeId.replace(prefix, '');
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  async getEmployeeStats() {
    const [total, active, onboarding, underReviewProbation, extendedProbation, confirmedProbation, deptsCount] =
      await Promise.all([
        this.prisma.employee.count(),
        this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
        this.prisma.employee.count({ where: { status: 'ONBOARDING' } }),
        this.prisma.employee.count({ where: { probationStatus: 'UNDER_REVIEW' } }),
        this.prisma.employee.count({ where: { probationStatus: 'EXTENDED' } }),
        this.prisma.employee.count({ where: { probationStatus: 'CONFIRMED' } }),
        this.prisma.department.count({ where: { isActive: true } }),
      ]);

    return {
      totalEmployees: total,
      activeEmployees: active,
      onboardingEmployees: onboarding,
      probationEmployees: underReviewProbation + extendedProbation,
      confirmedEmployees: confirmedProbation,
      departmentsCount: deptsCount,
    };
  }

  async createEmployee(data: {
    employeeId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dob?: string | Date;
    address?: string;
    departmentId: string;
    designation: string;
    dateOfJoining: string | Date;
    probationEnd?: string | Date;
    probationStatus?: ProbationStatus;
    totalExperienceYears?: number;
    status?: EmployeeStatus;
    managerId?: string;
    bankId?: number;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    panNumber?: string;
    aadharNumber?: string;
    resumeUrl?: string;
    systemAccess?: {
      erpLogin?: boolean;
      email?: boolean;
      attendanceApp?: boolean;
      vpn?: boolean;
    };
    photoUrl?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      let finalEmpId = data.employeeId?.trim() ? data.employeeId.trim().toUpperCase() : null;
      if (!finalEmpId) {
        throw new Error('Employee ID is required.');
      }

      const doj = new Date(data.dateOfJoining);
      let probationEndDate = data.probationEnd ? new Date(data.probationEnd) : null;
      if (!probationEndDate && !isNaN(doj.getTime())) {
        probationEndDate = new Date(doj);
        probationEndDate.setMonth(probationEndDate.getMonth() + 6);
      }

      const parsedDob = data.dob ? new Date(data.dob) : null;

      const employee = await tx.employee.create({
        data: {
          employeeId: finalEmpId,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone?.trim() || null,
          resumeUrl: data.resumeUrl?.trim() || null,
          dob: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : null,
          address: data.address?.trim() || null,
          departmentId: data.departmentId,
          designation: data.designation.trim(),
          managerId: data.managerId || null,
          dateOfJoining: doj,
          probationEnd: probationEndDate,
          probationStatus: data.probationStatus || 'UNDER_REVIEW',
          totalExperienceYears: Number(data.totalExperienceYears) || 0.0,
          status: data.status || 'ACTIVE',
          bankId: data.bankId ? Number(data.bankId) : null,
          bankName: data.bankName?.trim() || null,
          accountNumber: data.accountNumber?.trim() || null,
          ifscCode: data.ifscCode?.trim()?.toUpperCase() || null,
          panNumber: data.panNumber?.trim()?.toUpperCase() || null,
          aadharNumber: data.aadharNumber?.trim()?.replace(/\s+/g, '') || null,
        },
      });

      // Create system access if specified
      if (data.systemAccess) {
        await tx.systemAccess.create({
          data: {
            employeeId: employee.id,
            erpLogin: Boolean(data.systemAccess.erpLogin),
            email: Boolean(data.systemAccess.email),
            attendanceApp: Boolean(data.systemAccess.attendanceApp),
            vpn: Boolean(data.systemAccess.vpn),
          },
        });
      }

      // Provision standard onboarding documents
      const standardDocTypes = [
        'Photo',
        'ID Proof',
        'Address Proof',
        'Educational Certificates',
        'Previous Employment Documents',
        'Bank Account Details',
        'Signed Appointment Letter',
      ];

      await tx.onboardingDocument.createMany({
        data: standardDocTypes.map((docType) => ({
          employeeId: employee.id,
          documentType: docType,
          status: (docType === 'Photo' && data.photoUrl) ? 'VERIFIED' : 'PENDING',
          fileUrl: (docType === 'Photo' && data.photoUrl) ? data.photoUrl : null,
          verifiedAt: (docType === 'Photo' && data.photoUrl) ? new Date() : null,
        })),
      });

      // Default leave balances & salary structure if active/confirmed
      if (data.probationStatus === 'CONFIRMED' || data.status === 'ACTIVE') {
        await tx.leaveBalance.createMany({
          data: [
            { employeeId: employee.id, leaveType: 'Casual', allocated: 12, used: 0 },
            { employeeId: employee.id, leaveType: 'Sick', allocated: 10, used: 0 },
            { employeeId: employee.id, leaveType: 'Earned', allocated: 15, used: 0 },
          ],
          skipDuplicates: true,
        });

        await tx.salaryStructure.create({
          data: {
            employeeId: employee.id,
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

      return tx.employee.findUnique({
        where: { id: employee.id },
        include: {
          department: true,
          manager: true,
          documents: true,
          systemAccess: true,
          bank: true,
        },
      });
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
