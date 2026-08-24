import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  Prisma,
  JobRequisitionStatus,
  CandidateStatus,
  InterviewStatus,
  Recommendation,
  OfferStatus,
} from '@prisma/client';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

@Injectable()
export class RecruitmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Departments
  async findManyDepartments(query: PaginationQueryDto = {}) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if ((query as any).isActive !== undefined) {
      where.isActive =
        (query as any).isActive === 'true' || (query as any).isActive === true;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
    } else {
      orderBy.name = 'asc';
    }

    const findOptions: Prisma.DepartmentFindManyArgs = { where, orderBy };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.department.findMany(findOptions),
      this.prisma.department.count({ where }),
    ]);

    const dataWithCounts = await Promise.all(
      data.map(async (dept) => {
        let reqCount = 0;
        let lmCount = 0;
        try {
          reqCount = await this.prisma.jobRequisition.count({
            where: { departmentId: dept.id },
          });
        } catch (e) {}
        try {
          lmCount = await this.prisma.departmentLeaveMaster.count({
            where: { departmentId: dept.id },
          });
        } catch (e) {}
        return {
          ...dept,
          activeRequisitions: reqCount + lmCount,
        };
      }),
    );

    return {
      data: dataWithCounts,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async createDepartment(name: string, isActive: boolean = true) {
    return this.prisma.department.create({
      data: { name, isActive },
    });
  }

  async updateDepartment(id: string, name?: string, isActive?: boolean) {
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (isActive !== undefined) data.isActive = isActive;
    return this.prisma.department.update({
      where: { id },
      data,
    });
  }

  async deleteDepartment(id: string) {
    return this.prisma.department.delete({
      where: { id },
    });
  }

  // Training Types
  async findManyTrainingTypes(query: PaginationQueryDto = {}) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TrainingTypeWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if ((query as any).isActive !== undefined) {
      where.isActive =
        (query as any).isActive === 'true' || (query as any).isActive === true;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
    } else {
      orderBy.name = 'asc';
    }

    const findOptions: Prisma.TrainingTypeFindManyArgs = { where, orderBy };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.trainingType.findMany(findOptions),
      this.prisma.trainingType.count({ where }),
    ]);

    const dataWithCounts = await Promise.all(
      data.map(async (type) => {
        let trainCount = 0;
        try {
          trainCount = await this.prisma.trainingRecord.count({
            where: {
              trainingType: {
                name: { equals: type.name, mode: 'insensitive' },
              },
            },
          });
        } catch (e) {}
        return {
          ...type,
          activeTrainings: trainCount,
        };
      }),
    );

    return {
      data: dataWithCounts,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async createTrainingType(name: string, isActive: boolean = true) {
    return this.prisma.trainingType.create({
      data: { name, isActive },
    });
  }

  async updateTrainingType(id: string, name?: string, isActive?: boolean) {
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (isActive !== undefined) data.isActive = isActive;
    return this.prisma.trainingType.update({
      where: { id },
      data,
    });
  }

  async deleteTrainingType(id: string) {
    return this.prisma.trainingType.delete({
      where: { id },
    });
  }

  // Requisitions
  async findManyRequisitions(
    query: PaginationQueryDto & { status?: string; departmentId?: string } = {},
  ) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobRequisitionWhereInput = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { raisedBy: { contains: query.search, mode: 'insensitive' } },
        {
          department: { name: { contains: query.search, mode: 'insensitive' } },
        },
        { jobSpecification: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as JobRequisitionStatus;
    }
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const findOptions: Prisma.JobRequisitionFindManyArgs = {
      where,
      include: {
        candidates: true,
        department: true,
        cnvRecord: {
          include: {
            history: { orderBy: { createdAt: 'asc' } },
          },
        },
        replacementForEmployee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
            dateOfJoining: true,
            department: { select: { id: true, name: true } },
            salaryStructures: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { grossSalary: true, basicSalary: true },
            },
            exitProcess: {
              select: {
                type: true,
                resignationDate: true,
                lastWorkingDay: true,
                reason: true,
              },
            },
          },
        },
      },
      orderBy,
    };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.jobRequisition.findMany(findOptions),
      this.prisma.jobRequisition.count({ where }),
    ]);

    return {
      data,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async createRequisition(dto: CreateRequisitionDto) {
    const payload: any = { ...dto };
    if (payload.cnvNotificationDate) {
      payload.cnvNotificationDate = new Date(payload.cnvNotificationDate);
    }
    const req = await this.prisma.jobRequisition.create({
      data: payload,
      include: {
        department: true,
        candidates: true,
        cnvRecord: { include: { history: { orderBy: { createdAt: 'asc' } } } },
        replacementForEmployee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
            dateOfJoining: true,
            department: { select: { id: true, name: true } },
            salaryStructures: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { grossSalary: true, basicSalary: true },
            },
          },
        },
      },
    });
    // Auto-create CnvRecord when CNV is applicable
    if (payload.isCnvApplicable) {
      await this.findOrCreateCnvRecord(
        req.id,
        payload.cnvExchangeOffice || null,
        'System',
      );
    }
    return req;
  }

  async updateRequisitionStatus(id: string, status: string) {
    return this.prisma.jobRequisition.update({
      where: { id },
      data: { status: status as JobRequisitionStatus },
      include: {
        department: true,
        candidates: true,
        cnvRecord: { include: { history: { orderBy: { createdAt: 'asc' } } } },
        replacementForEmployee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
            dateOfJoining: true,
            department: { select: { id: true, name: true } },
            salaryStructures: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { grossSalary: true, basicSalary: true },
            },
          },
        },
      },
    });
  }

  async updateRequisition(id: string, data: any) {
    const payload: any = { ...data };
    if (
      payload &&
      payload.experienceRequired !== undefined &&
      payload.experienceRequired !== null
    ) {
      payload.experienceRequired = Number(payload.experienceRequired) || 0.0;
    }
    if (payload.cnvNotificationDate) {
      payload.cnvNotificationDate = new Date(payload.cnvNotificationDate);
    }
    const result = await this.prisma.jobRequisition.update({
      where: { id },
      data: payload,
      include: {
        department: true,
        candidates: true,
        cnvRecord: { include: { history: { orderBy: { createdAt: 'asc' } } } },
        replacementForEmployee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
            dateOfJoining: true,
            department: { select: { id: true, name: true } },
            salaryStructures: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { grossSalary: true, basicSalary: true },
            },
          },
        },
      },
    });
    // If CNV toggled on for the first time, create CnvRecord
    if (payload.isCnvApplicable && !result.cnvRecord) {
      await this.findOrCreateCnvRecord(
        id,
        payload.cnvExchangeOffice || null,
        'System',
      );
    }
    return result;
  }

  async deleteRequisition(id: string) {
    // Delete related candidates first
    await this.prisma.candidate.deleteMany({ where: { requisitionId: id } });
    return this.prisma.jobRequisition.delete({
      where: { id },
    });
  }

  // Candidates
  async findManyCandidates(
    query: PaginationQueryDto & {
      status?: string;
      requisitionId?: string;
    } = {},
  ) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidateWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { source: { contains: query.search, mode: 'insensitive' } },
        {
          requisition: {
            title: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as CandidateStatus;
    }
    if (query.requisitionId) {
      where.requisitionId = query.requisitionId;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const findOptions: Prisma.CandidateFindManyArgs = {
      where,
      include: {
        requisition: {
          include: {
            department: true,
            replacementForEmployee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
            },
          },
        },
        schedules: true,
        offer: true,
      },
      orderBy,
    };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany(findOptions),
      this.prisma.candidate.count({ where }),
    ]);

    return {
      data,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async createCandidate(dto: CreateCandidateDto) {
    return this.prisma.candidate.create({
      data: {
        name: dto.name,
        email: dto.email ? dto.email.toLowerCase().trim() : '',
        phone: dto.phone,
        resumeUrl: dto.resumeUrl || '',
        source: dto.source,
        requisitionId: dto.requisitionId,
        experienceYears: Number(dto.experienceYears) || 0.0,
      },
      include: { requisition: true, schedules: true, offer: true },
    });
  }

  async updateCandidateStatus(id: string, status: string) {
    const updateData: any = { status };
    if (status === 'REJECTED') {
      updateData.rejectedAt = new Date();
      updateData.isReInterview = true;
      updateData.coolOffDaysLeft = 30;
      updateData.rejectionCount = { increment: 1 };
    }
    return this.prisma.candidate.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteCandidate(id: string) {
    // Delete related schedules and offers first
    await this.prisma.interviewSchedule.deleteMany({
      where: { candidateId: id },
    });
    await this.prisma.offerLetter.deleteMany({ where: { candidateId: id } });
    return this.prisma.candidate.delete({
      where: { id },
    });
  }

  async findCandidateById(id: string) {
    return this.prisma.candidate.findUnique({
      where: { id },
    });
  }

  // Schedules
  async findManySchedules(
    query: PaginationQueryDto & { status?: string; candidateId?: string } = {},
  ) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InterviewScheduleWhereInput = {};
    if (query.search) {
      where.OR = [
        { roundName: { contains: query.search, mode: 'insensitive' } },
        {
          candidate: { name: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as InterviewStatus;
    }
    if (query.candidateId) {
      where.candidateId = query.candidateId;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.scheduledAt = 'desc';
    }

    const findOptions: Prisma.InterviewScheduleFindManyArgs = {
      where,
      include: { candidate: true, feedbacks: true },
      orderBy,
    };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.interviewSchedule.findMany(findOptions),
      this.prisma.interviewSchedule.count({ where }),
    ]);

    return {
      data,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async createSchedule(dto: CreateScheduleDto) {
    const existingCount = await this.prisma.interviewSchedule.count({
      where: { candidateId: dto.candidateId },
    });

    let panelistsArray: string[] = [];
    if (Array.isArray(dto.panelists)) {
      panelistsArray = dto.panelists;
    } else if (typeof dto.panelists === 'string') {
      const trimmed = dto.panelists.trim();
      if (trimmed.startsWith('[')) {
        try {
          panelistsArray = JSON.parse(trimmed);
        } catch (e) {}
      } else {
        panelistsArray = trimmed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    return this.prisma.interviewSchedule.create({
      data: {
        candidateId: dto.candidateId,
        roundName: dto.roundName,
        scheduledAt: new Date(dto.scheduledAt),
        panelists: panelistsArray,
        attemptNumber: existingCount + 1,
        isReschedule: existingCount > 0,
      },
    });
  }

  async updateScheduleStatus(id: string, status: string) {
    return this.prisma.interviewSchedule.update({
      where: { id },
      data: { status: status as InterviewStatus },
    });
  }

  async updateSchedule(id: string, data: any) {
    if (data.scheduledAt) {
      data.scheduledAt = new Date(data.scheduledAt);
    }
    if (data.panelists !== undefined) {
      let panelistsArray: string[] = [];
      if (Array.isArray(data.panelists)) {
        panelistsArray = data.panelists;
      } else if (typeof data.panelists === 'string') {
        const trimmed = data.panelists.trim();
        if (trimmed.startsWith('[')) {
          try {
            panelistsArray = JSON.parse(trimmed);
          } catch (e) {}
        } else {
          panelistsArray = trimmed
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      data.panelists = panelistsArray;
    }
    return this.prisma.interviewSchedule.update({
      where: { id },
      data,
    });
  }

  async deleteSchedule(id: string) {
    // Delete feedbacks first
    await this.prisma.interviewFeedback.deleteMany({
      where: { scheduleId: id },
    });
    return this.prisma.interviewSchedule.delete({
      where: { id },
    });
  }

  // Feedbacks
  async createFeedback(dto: CreateFeedbackDto) {
    return this.prisma.interviewFeedback.create({
      data: {
        scheduleId: dto.scheduleId,
        panelistName: dto.panelistName,
        panelistId: dto.panelistId,
        rating: dto.rating,
        comments: dto.comments,
        recommendation: dto.recommendation as Recommendation,
      },
    });
  }

  async updateFeedback(id: string, data: any) {
    if (data.rating !== undefined) data.rating = Number(data.rating);
    return this.prisma.interviewFeedback.update({
      where: { id },
      data,
    });
  }

  async deleteFeedback(id: string) {
    return this.prisma.interviewFeedback.delete({
      where: { id },
    });
  }

  // Offers
  async findManyOffers(query: PaginationQueryDto & { status?: string } = {}) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OfferLetterWhereInput = {};
    if (query.search) {
      where.OR = [
        { role: { contains: query.search, mode: 'insensitive' } },
        {
          candidate: { name: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as OfferStatus;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const findOptions: Prisma.OfferLetterFindManyArgs = {
      where,
      include: {
        candidate: {
          include: {
            requisition: {
              include: {
                department: true,
                replacementForEmployee: {
                  select: {
                    id: true,
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy,
    };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.offerLetter.findMany(findOptions),
      this.prisma.offerLetter.count({ where }),
    ]);

    return {
      data,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async findOfferById(id: string) {
    return this.prisma.offerLetter.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            requisition: {
              include: {
                department: true,
                replacementForEmployee: {
                  select: {
                    id: true,
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createOffer(dto: CreateOfferDto) {
    return this.prisma.offerLetter.create({
      data: {
        candidateId: dto.candidateId,
        role: dto.role,
        salary: dto.salary,
        joiningDate: new Date(dto.joiningDate),
      },
      include: {
        candidate: {
          include: {
            requisition: {
              include: {
                department: true,
                replacementForEmployee: {
                  select: {
                    id: true,
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateOfferStatus(id: string, status: string) {
    return this.prisma.offerLetter.update({
      where: { id },
      data: { status: status as OfferStatus },
      include: {
        candidate: {
          include: {
            requisition: {
              include: {
                department: true,
                replacementForEmployee: {
                  select: {
                    id: true,
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateOffer(id: string, data: any) {
    if (data.joiningDate) {
      data.joiningDate = new Date(data.joiningDate);
    }
    return this.prisma.offerLetter.update({
      where: { id },
      data,
      include: {
        candidate: {
          include: {
            requisition: {
              include: {
                department: true,
                replacementForEmployee: {
                  select: {
                    id: true,
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async deleteOffer(id: string) {
    return this.prisma.offerLetter.delete({
      where: { id },
    });
  }

  async updateCandidate(id: string, data: any) {
    if (data && data.email && typeof data.email === 'string') {
      data.email = data.email.toLowerCase().trim();
    }
    if (
      data &&
      data.experienceYears !== undefined &&
      data.experienceYears !== null
    ) {
      data.experienceYears = Number(data.experienceYears) || 0.0;
    }
    const cand = await this.prisma.candidate.update({
      where: { id },
      data,
    });
    if (cand.email && data.experienceYears !== undefined) {
      await this.prisma.employee.updateMany({
        where: { email: { equals: cand.email, mode: 'insensitive' } },
        data: { totalExperienceYears: Number(data.experienceYears) || 0.0 },
      });
    }
    return cand;
  }

  async findEmployeesForDropdown() {
    const employees = await this.prisma.employee.findMany({
      where: {
        OR: [
          { status: { in: ['EXITING', 'RELIEVED'] } },
          { exitProcess: { isNot: null } },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        status: true,
        dateOfJoining: true,
        totalExperienceYears: true,
        createdAt: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        salaryStructures: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            grossSalary: true,
            basicSalary: true,
          },
        },
        payslips: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            grossEarnings: true,
            basicSalary: true,
          },
        },
        exitProcess: {
          select: {
            type: true,
            status: true,
            resignationDate: true,
            lastWorkingDay: true,
            reason: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const emails = employees.map((e) => e.email).filter(Boolean);
    const candidateData = await this.prisma.candidate.findMany({
      where: {
        email: { in: emails, mode: 'insensitive' },
      },
      select: {
        email: true,
        experienceYears: true,
        offer: {
          select: {
            salary: true,
          },
        },
      },
    });

    const offerMap = new Map(
      candidateData.map((c) => [c.email.toLowerCase(), c.offer?.salary]),
    );
    const expMap = new Map(
      candidateData.map((c) => [c.email.toLowerCase(), c.experienceYears]),
    );

    return employees.map((emp) => {
      const emailLower = emp.email?.toLowerCase();
      const offerSalary = (emailLower && offerMap.get(emailLower)) || 0;
      const candidateExp = (emailLower && expMap.get(emailLower)) || 0;
      return {
        ...emp,
        totalExperienceYears:
          emp.totalExperienceYears && emp.totalExperienceYears > 0
            ? emp.totalExperienceYears
            : candidateExp,
        dateOfJoining: emp.dateOfJoining || emp.createdAt,
        offerSalary,
      };
    });
  }

  // Employee creation helper
  async getNextEmployeeSequence(year: number): Promise<number> {
    const prefix = `aspino_${year}_`;
    const count = await this.prisma.employee.count({
      where: {
        employeeId: {
          startsWith: prefix,
          mode: 'insensitive',
        },
      },
    });
    return count + 1;
  }

  async createEmployee(data: any) {
    return this.prisma.employee.create({
      data,
    });
  }

  async createOnboardingDocuments(documents: any[]) {
    return this.prisma.onboardingDocument.createMany({
      data: documents,
    });
  }

  // Fiscal Years
  async findManyFiscalYears(query: PaginationQueryDto = {}) {
    const isPaginated = query.page !== undefined || query.limit !== undefined;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.FiscalYearWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if ((query as any).isActive !== undefined) {
      where.isActive =
        (query as any).isActive === 'true' || (query as any).isActive === true;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
    } else {
      orderBy.name = 'asc';
    }

    const findOptions: Prisma.FiscalYearFindManyArgs = {
      where,
      orderBy,
    };
    if (isPaginated) {
      findOptions.skip = skip;
      findOptions.take = limit;
    }

    const [data, total] = await Promise.all([
      this.prisma.fiscalYear.findMany(findOptions),
      this.prisma.fiscalYear.count({ where }),
    ]);

    const dataWithCounts = await Promise.all(
      data.map(async (fy) => {
        let lmCount = 0;
        try {
          lmCount = await this.prisma.departmentLeaveMaster.count({
            where: {
              OR: [
                { fiscalYearId: fy.id },
                {
                  fiscalYear: {
                    name: { equals: fy.name, mode: 'insensitive' },
                  },
                },
              ],
            },
          });
        } catch (e) {}
        return {
          ...fy,
          activeRequisitions: lmCount,
        };
      }),
    );

    return {
      data: dataWithCounts,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
    };
  }

  async createFiscalYear(data: { name: string; isActive?: boolean }) {
    return this.prisma.fiscalYear.create({
      data: {
        name: data.name,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async updateFiscalYear(
    id: string,
    data: { name?: string; isActive?: boolean },
  ) {
    return this.prisma.fiscalYear.update({
      where: { id },
      data,
    });
  }

  async deleteFiscalYear(id: string) {
    return this.prisma.fiscalYear.delete({
      where: { id },
    });
  }

  // ---------------------------------------------------------------------------
  // CNV Record Methods
  // ---------------------------------------------------------------------------

  async findOrCreateCnvRecord(
    requisitionId: string,
    employmentExchangeOffice?: string | null,
    performedBy?: string,
  ) {
    const existing = await this.prisma.cnvRecord.findUnique({
      where: { requisitionId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) return existing;

    const record = await this.prisma.cnvRecord.create({
      data: {
        requisitionId,
        cnvStatus: 'PENDING_NOTIFICATION',
        employmentExchangeOffice: employmentExchangeOffice || null,
        history: {
          create: {
            action: 'REQUISITION_CREATED',
            description:
              'Requisition created with CNV applicable. Pending notification to Employment Exchange.',
            performedBy: performedBy || 'System',
          },
        },
      },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
    return record;
  }

  async getCnvRecord(requisitionId: string) {
    return this.prisma.cnvRecord.findUnique({
      where: { requisitionId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async updateCnvRecord(requisitionId: string, data: any) {
    return this.prisma.cnvRecord.update({
      where: { requisitionId },
      data,
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async createCnvHistory(
    cnvRecordId: string,
    action: string,
    description: string,
    performedBy?: string,
    metadata?: any,
  ) {
    return this.prisma.cnvHistory.create({
      data: {
        cnvRecordId,
        action,
        description,
        performedBy: performedBy || 'System',
        metadata: metadata || undefined,
      },
    });
  }
}
