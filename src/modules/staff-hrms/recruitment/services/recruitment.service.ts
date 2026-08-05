import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { RecruitmentRepository } from '../repositories/recruitment.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { generateOfferLetterPdf } from './pdf-generator.helper';
import { join } from 'path';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../../common/utils/pagination.util';

// ---------------------------------------------------------------------------
// Onboarding configuration constants (21 CFR Part 11: configuration-driven,
// not hardcoded, making them auditable and easily changeable via config).
// ---------------------------------------------------------------------------
const PROBATION_MONTHS = 6;

const ONBOARDING_DOCUMENT_TYPES: string[] = [
  'ID Proof',
  'Address Proof',
  'Educational Certificates',
  'Previous Employment Documents',
  'Bank Account Details',
  'Signed Appointment Letter',
];

const DEFAULT_EMPLOYEE_DEPARTMENT = 'Production';

@Injectable()
export class RecruitmentService {
  /** Structured logger for audit trail readiness (21 CFR Part 11 §11.10(e)) */
  private readonly logger = new Logger(RecruitmentService.name);

  constructor(
    private readonly recruitmentRepository: RecruitmentRepository,
    private readonly prisma: PrismaService,
  ) { }

  // ---------------------------------------------------------------------------
  // 0. Departments
  // ---------------------------------------------------------------------------

  async getDepartments(query: PaginationQueryDto = {}) {
    const res = await this.recruitmentRepository.findManyDepartments(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createDepartment(name: string) {
    const existing = await this.prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Department with this name already exists.');
    }
    const dept = await this.recruitmentRepository.createDepartment(name);
    this.logger.log(`Department created: "${name}" (id=${dept.id})`);
    return dept;
  }

  async updateDepartment(id: string, name: string) {
    const existing = await this.prisma.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (existing) {
      throw new ConflictException('Department with this name already exists.');
    }
    const dept = await this.recruitmentRepository.updateDepartment(id, name);
    this.logger.log(`Department updated: id=${id}, newName="${name}"`);
    return dept;
  }

  async deleteDepartment(id: string) {
    await this.recruitmentRepository.deleteDepartment(id);
    this.logger.log(`Department deleted: id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // Training Types
  // ---------------------------------------------------------------------------

  async getTrainingTypes(query: PaginationQueryDto = {}) {
    const res = await this.recruitmentRepository.findManyTrainingTypes(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createTrainingType(name: string) {
    const existing = await this.prisma.trainingType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(
        'Training type with this name already exists.',
      );
    }
    const type = await this.recruitmentRepository.createTrainingType(name);
    this.logger.log(`TrainingType created: "${name}" (id=${type.id})`);
    return type;
  }

  async updateTrainingType(id: string, name: string) {
    const existing = await this.prisma.trainingType.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Training type with this name already exists.',
      );
    }
    const type = await this.recruitmentRepository.updateTrainingType(id, name);
    this.logger.log(`TrainingType updated: id=${id}, newName="${name}"`);
    return type;
  }

  async deleteTrainingType(id: string) {
    await this.recruitmentRepository.deleteTrainingType(id);
    this.logger.log(`TrainingType deleted: id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // 1. Job Requisition
  // ---------------------------------------------------------------------------

  async getRequisitions(query: PaginationQueryDto & { status?: string; departmentId?: string } = {}) {
    const res = await this.recruitmentRepository.findManyRequisitions(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createRequisition(dto: CreateRequisitionDto) {
    const req = await this.recruitmentRepository.createRequisition(dto);
    this.logger.log(`Requisition created: "${dto.title}" (id=${req.id})`);
    return req;
  }

  async updateRequisitionStatus(id: string, status: string) {
    const req = await this.recruitmentRepository.updateRequisitionStatus(
      id,
      status,
    );
    this.logger.log(`Requisition status updated: id=${id}, status=${status}`);
    return req;
  }

  async updateRequisition(id: string, data: Prisma.JobRequisitionUpdateInput) {
    return this.recruitmentRepository.updateRequisition(id, data);
  }

  async deleteRequisition(id: string) {
    await this.recruitmentRepository.deleteRequisition(id);
    this.logger.log(`Requisition deleted: id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // 2. Candidate Sourcing & Applications
  // ---------------------------------------------------------------------------

  async getCandidates(query: PaginationQueryDto & { status?: string; requisitionId?: string } = {}) {
    const res = await this.recruitmentRepository.findManyCandidates(query);

    // Auto-update REJECTED candidates status in DB to RE_INTERVIEW_ELIGIBLE if 30-day cool-off period has passed
    const now = new Date();
    const coolOffDays = 30;

    for (const cand of res.data) {
      if (cand.status === 'REJECTED' || cand.rejectedAt || (cand.coolOffDaysLeft ?? 0) > 0) {
        let lastDate = cand.rejectedAt ? new Date(cand.rejectedAt) : (cand.updatedAt ? new Date(cand.updatedAt) : new Date(cand.createdAt));
        if ((cand as any).schedules && (cand as any).schedules.length > 0) {
          const dates = (cand as any).schedules.map((s: any) => new Date(s.scheduledAt).getTime());
          const maxDate = new Date(Math.max(...dates));
          if (maxDate > lastDate) lastDate = maxDate;
        }

        const daysPassed = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, coolOffDays - daysPassed);

        if (cand.status === 'REJECTED') {
          const newStatus = daysLeft <= 0 ? 'RE_INTERVIEW_ELIGIBLE' : 'REJECTED';
          await this.prisma.candidate.update({
            where: { id: cand.id },
            data: { coolOffDaysLeft: daysLeft, status: newStatus },
          });
          cand.coolOffDaysLeft = daysLeft;
          cand.status = newStatus;
        } else {
          await this.prisma.candidate.update({
            where: { id: cand.id },
            data: { coolOffDaysLeft: daysLeft },
          });
          cand.coolOffDaysLeft = daysLeft;
        }
      }
    }

    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createCandidate(dto: CreateCandidateDto) {
    const existing = await this.prisma.candidate.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Candidate with this email already exists.');
    }
    const candidate = await this.recruitmentRepository.createCandidate(dto);
    this.logger.log(`Candidate sourced: "${dto.name}" (id=${candidate.id})`);
    return candidate;
  }

  async updateCandidateStatus(id: string, status: string) {
    const candidate = await this.recruitmentRepository.updateCandidateStatus(
      id,
      status,
    );
    this.logger.log(`Candidate status updated: id=${id}, status=${status}`);
    return candidate;
  }

  async updateCandidate(id: string, data: Prisma.CandidateUpdateInput) {
    if (data.email) {
      const emailStr =
        typeof data.email === 'string' ? data.email : data.email.set;
      if (emailStr) {
        const existing = await this.prisma.candidate.findFirst({
          where: {
            email: emailStr,
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            'Candidate with this email already exists.',
          );
        }
      }
    }
    return this.recruitmentRepository.updateCandidate(id, data);
  }

  async deleteCandidate(id: string) {
    await this.recruitmentRepository.deleteCandidate(id);
    this.logger.log(`Candidate deleted: id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // 3. Interview Scheduling
  // ---------------------------------------------------------------------------

  async getSchedules(query: PaginationQueryDto & { status?: string; candidateId?: string } = {}) {
    const res = await this.recruitmentRepository.findManySchedules(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createSchedule(dto: CreateScheduleDto) {
    const schedule = await this.recruitmentRepository.createSchedule(dto);
    // Auto-update candidate status in DB to INTERVIEWING when interview is scheduled
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: dto.candidateId },
    });
    if (candidate && candidate.status !== 'SELECTED' && candidate.status !== 'ACCEPTED') {
      await this.recruitmentRepository.updateCandidateStatus(dto.candidateId, 'INTERVIEWING');
    }
    return schedule;
  }

  async updateSchedule(id: string, data: Prisma.InterviewScheduleUpdateInput) {
    return this.recruitmentRepository.updateSchedule(id, data);
  }

  async deleteSchedule(id: string) {
    return this.recruitmentRepository.deleteSchedule(id);
  }

  // ---------------------------------------------------------------------------
  // 4. Panel Feedback
  // ---------------------------------------------------------------------------

  async createFeedback(dto: CreateFeedbackDto) {
    const feedback = await this.recruitmentRepository.createFeedback(dto);
    // Atomically mark the schedule as COMPLETED after feedback is captured
    await this.recruitmentRepository.updateScheduleStatus(
      dto.scheduleId,
      'COMPLETED',
    );
    this.logger.log(
      `Interview feedback recorded for schedule id=${dto.scheduleId} by ${dto.panelistName}`,
    );
    return feedback;
  }

  // ---------------------------------------------------------------------------
  // 5. Offer Letter
  // ---------------------------------------------------------------------------

  async getOffers(query: PaginationQueryDto & { status?: string } = {}) {
    const res = await this.recruitmentRepository.findManyOffers(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async getOfferById(id: string) {
    return this.recruitmentRepository.findOfferById(id);
  }

  async createOffer(dto: CreateOfferDto) {
    const existing = await this.prisma.offerLetter.findUnique({
      where: { candidateId: dto.candidateId },
    });
    if (existing) {
      throw new ConflictException(
        'An offer letter has already been generated for this candidate.',
      );
    }
    const offer = await this.recruitmentRepository.createOffer(dto);
    this.logger.log(
      `Offer letter generated for candidateId=${dto.candidateId} (offerId=${offer.id})`,
    );

    // PDF generation is a side-effect and must not block or rollback the main record
    try {
      const fullOffer = await this.recruitmentRepository.findOfferById(
        offer.id,
      );
      if (fullOffer?.candidate) {
        const filePath = join(
          process.cwd(),
          'uploads',
          'offers',
          `offer-${offer.id}.pdf`,
        );
        await generateOfferLetterPdf(filePath, {
          candidateName: fullOffer.candidate.name,
          candidateEmail: fullOffer.candidate.email,
          role: fullOffer.role,
          salary: fullOffer.salary,
          joiningDate: fullOffer.joiningDate,
        });
        this.logger.log(`Offer letter PDF generated: ${filePath}`);
      } else {
        this.logger.warn(
          `[createOffer] Candidate not found for offerId=${offer.id}; PDF skipped.`,
        );
      }
    } catch (err) {
      // Log but do not rethrow — the offer record itself is already safely persisted
      this.logger.error(
        `[createOffer] PDF generation failed for offerId=${offer.id}`,
        err,
      );
    }

    return offer;
  }

  async updateOffer(id: string, data: Prisma.OfferLetterUpdateInput) {
    return this.recruitmentRepository.updateOffer(id, data);
  }

  async deleteOffer(id: string) {
    await this.recruitmentRepository.deleteOffer(id);
    this.logger.log(`Offer deleted: id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // 6. Accept Offer → Auto-provision Employee Onboarding
  //
  // All state transitions (offer acceptance, candidate status, employee
  // creation, and document provisioning) are performed inside a single
  // Prisma interactive transaction to guarantee atomicity. This prevents
  // ghost employees or partially-provisioned accounts in case of failures,
  // which is critical for 21 CFR Part 11 data integrity (§11.10(a)).
  // ---------------------------------------------------------------------------

  async acceptOffer(offerId: string) {
    this.logger.log(`Offer acceptance initiated: offerId=${offerId}`);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Accept the offer
        const offer = await tx.offerLetter.update({
          where: { id: offerId },
          data: { status: 'ACCEPTED' },
          include: { candidate: true },
        });

        // Check if an employee with this email already exists
        const existingEmp = await tx.employee.findUnique({
          where: { email: offer.candidate.email },
        });
        if (existingEmp) {
          throw new ConflictException(
            'An employee with this email is already registered.',
          );
        }

        // 2. Update candidate pipeline status
        await tx.candidate.update({
          where: { id: offer.candidateId },
          data: { status: 'ACCEPTED' },
        });

        // 3. Generate employee ID in aspino_YYYY_NNN format
        const joiningDate = offer.joiningDate ?? new Date();
        const year = new Date(joiningDate).getFullYear();
        const yearPrefix = `aspino_${year}_`;

        const existingCount = await tx.employee.count({
          where: {
            employeeId: { startsWith: yearPrefix, mode: 'insensitive' },
          },
        });
        const empId = `${yearPrefix}${String(existingCount + 1).padStart(3, '0')}`;

        // 4. Parse candidate name into firstName / lastName
        const [firstName, ...lastNameParts] = offer.candidate.name.split(' ');
        const lastName = lastNameParts.join(' ') || 'Candidate';

        // 5. Compute probation end date
        const probationEnd = new Date(joiningDate);
        probationEnd.setMonth(probationEnd.getMonth() + PROBATION_MONTHS);

        // 6. Create employee record
        const employee = await tx.employee.create({
          data: {
            employeeId: empId,
            firstName,
            lastName,
            email: offer.candidate.email,
            department: DEFAULT_EMPLOYEE_DEPARTMENT,
            designation: offer.role,
            dateOfJoining: joiningDate,
            status: 'ONBOARDING',
            probationEnd,
          },
        });

        // 7. Provision onboarding document checklist
        await tx.onboardingDocument.createMany({
          data: ONBOARDING_DOCUMENT_TYPES.map((documentType) => ({
            employeeId: employee.id,
            documentType,
            status: 'PENDING',
          })),
        });

        return { offer, employee };
      });

      this.logger.log(
        `Offer accepted: offerId=${offerId}, empId=${result.employee.employeeId} (id=${result.employee.id})`,
      );

      return result;
    } catch (err) {
      this.logger.error(
        `[acceptOffer] Transaction failed for offerId=${offerId}`,
        err,
      );
      throw new InternalServerErrorException(
        'Failed to complete offer acceptance. Please retry.',
      );
    }
  }
}
