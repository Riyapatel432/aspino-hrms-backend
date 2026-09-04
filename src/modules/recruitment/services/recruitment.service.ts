import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RecruitmentRepository } from '../repositories/recruitment.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import {
  generateOfferLetterPdf,
  generateCnvNotificationPdf,
} from './pdf-generator.helper';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

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
  ) {}

  // ---------------------------------------------------------------------------
  // 0. Departments
  // ---------------------------------------------------------------------------

  async getDepartments(query: PaginationQueryDto = {}) {
    const res = await this.recruitmentRepository.findManyDepartments(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createDepartment(name: string, isActive: boolean = true) {
    if (name) {
      const existing = await this.prisma.department.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (existing) {
        throw new ConflictException(
          'Department with this name already exists.',
        );
      }
    }
    const dept = await this.recruitmentRepository.createDepartment(
      name,
      isActive,
    );
    this.logger.log(`Department created: "${name}" (id=${dept.id})`);
    return dept;
  }

  async updateDepartment(id: string, name?: string, isActive?: boolean) {
    if (name) {
      const existing = await this.prisma.department.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          'Department with this name already exists.',
        );
      }
    }
    const dept = await this.recruitmentRepository.updateDepartment(
      id,
      name,
      isActive,
    );
    this.logger.log(
      `Department updated: id=${id}, name="${name}", isActive=${isActive}`,
    );
    return dept;
  }

  async deleteDepartment(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) return;

    let reqCount = 0;
    let empCount = 0;
    let lmCount = 0;
    try {
      reqCount = await this.prisma.jobRequisition.count({
        where: { departmentId: id },
      });
    } catch (e) {}
    try {
      empCount = await this.prisma.employee.count({
        where: { departmentId: id },
      });
    } catch (e) {}
    try {
      lmCount = await this.prisma.departmentLeaveMaster.count({
        where: { departmentId: id },
      });
    } catch (e) {}

    if (reqCount > 0 || empCount > 0 || lmCount > 0) {
      throw new ConflictException(
        `Department "${dept.name}" is already in use by requisitions, employees, or leave masters and cannot be deleted.`,
      );
    }

    try {
      await this.recruitmentRepository.deleteDepartment(id);
      this.logger.log(`Department deleted: id=${id}`);
    } catch (error) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new ConflictException(
          `Department "${dept.name}" is already in use and cannot be deleted.`,
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Training Types
  // ---------------------------------------------------------------------------

  async getTrainingTypes(query: PaginationQueryDto = {}) {
    const res = await this.recruitmentRepository.findManyTrainingTypes(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createTrainingType(name: string, isActive: boolean = true) {
    if (name) {
      const existing = await this.prisma.trainingType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (existing) {
        throw new ConflictException(
          'Training type with this name already exists.',
        );
      }
    }
    const type = await this.recruitmentRepository.createTrainingType(
      name,
      isActive,
    );
    this.logger.log(`TrainingType created: "${name}" (id=${type.id})`);
    return type;
  }

  async updateTrainingType(id: string, name?: string, isActive?: boolean) {
    if (name) {
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
    }
    const type = await this.recruitmentRepository.updateTrainingType(
      id,
      name,
      isActive,
    );
    this.logger.log(
      `TrainingType updated: id=${id}, name="${name}", isActive=${isActive}`,
    );
    return type;
  }

  async deleteTrainingType(id: string) {
    const type = await this.prisma.trainingType.findUnique({ where: { id } });
    if (!type) return;

    let trainCount = 0;
    try {
      trainCount = await this.prisma.trainingRecord.count({
        where: {
          trainingType: { name: { equals: type.name, mode: 'insensitive' } },
        },
      });
    } catch (e) {}
    if (trainCount > 0) {
      throw new ConflictException(
        `Training type "${type.name}" is already in use by employee trainings and cannot be deleted.`,
      );
    }

    try {
      await this.recruitmentRepository.deleteTrainingType(id);
      this.logger.log(`TrainingType deleted: id=${id}`);
    } catch (error) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new ConflictException(
          `Training type "${type.name}" is already in use and cannot be deleted.`,
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Job Requisition
  // ---------------------------------------------------------------------------

  async getRequisitions(
    query: PaginationQueryDto & { status?: string; departmentId?: string } = {},
  ) {
    const res = await this.recruitmentRepository.findManyRequisitions(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async getEmployeesForReplacement() {
    return this.recruitmentRepository.findEmployeesForDropdown();
  }

  async createRequisition(dto: CreateRequisitionDto) {
    if (
      dto.requisitionType === 'REPLACEMENT' &&
      !dto.replacementForEmployeeId
    ) {
      throw new BadRequestException(
        'Please select the employee who is being replaced for replacement requisitions.',
      );
    }
    const req = await this.recruitmentRepository.createRequisition(dto);
    this.logger.log(
      `Requisition created: "${dto.title}" (id=${req.id}, type=${req.requisitionType})`,
    );
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
    if (
      (data as any).requisitionType === 'REPLACEMENT' &&
      !(data as any).replacementForEmployeeId &&
      !(data as any).replacementForEmployee
    ) {
      // If updating to REPLACEMENT, require replacement employee
      const existing = await this.prisma.jobRequisition.findUnique({
        where: { id },
      });
      if (
        !existing?.replacementForEmployeeId &&
        !(data as any).replacementForEmployeeId
      ) {
        throw new BadRequestException(
          'Please select the employee who is being replaced for replacement requisitions.',
        );
      }
    }
    return this.recruitmentRepository.updateRequisition(id, data);
  }

  async deleteRequisition(id: string) {
    await this.recruitmentRepository.deleteRequisition(id);
    this.logger.log(`Requisition deleted: id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // 2. Candidate Sourcing & Applications
  // ---------------------------------------------------------------------------

  async getCandidates(
    query: PaginationQueryDto & {
      status?: string;
      requisitionId?: string;
    } = {},
  ) {
    const res = await this.recruitmentRepository.findManyCandidates(query);

    // Auto-update REJECTED candidates status in DB to RE_INTERVIEW_ELIGIBLE if 30-day cool-off period has passed
    const now = new Date();
    const coolOffDays = 30;

    for (const cand of res.data) {
      if (
        cand.status === 'REJECTED' ||
        cand.rejectedAt ||
        (cand.coolOffDaysLeft ?? 0) > 0
      ) {
        let lastDate = cand.rejectedAt
          ? new Date(cand.rejectedAt)
          : cand.updatedAt
            ? new Date(cand.updatedAt)
            : new Date(cand.createdAt);
        if ((cand as any).schedules && (cand as any).schedules.length > 0) {
          const dates = (cand as any).schedules.map((s: any) =>
            new Date(s.scheduledAt).getTime(),
          );
          const maxDate = new Date(Math.max(...dates));
          if (maxDate > lastDate) lastDate = maxDate;
        }

        const daysPassed = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const daysLeft = Math.max(0, coolOffDays - daysPassed);

        if (cand.status === 'REJECTED') {
          const newStatus =
            daysLeft <= 0 ? 'RE_INTERVIEW_ELIGIBLE' : 'REJECTED';
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

  private validateCandidateContactInfo(email?: string, phone?: string) {
    if (email) {
      const emailTrimmed = email.toLowerCase().trim();
      const emailRx =
        /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
      if (!emailRx.test(emailTrimmed)) {
        throw new BadRequestException('Please provide a valid email address.');
      }
      const [username, domain] = emailTrimmed.split('@');
      if (domain === 'gmail.com' || domain === 'googlemail.com') {
        if (!/^[a-z0-9]+(\.[a-z0-9]+)*$/i.test(username)) {
          throw new BadRequestException(
            'Sorry, only letters (a-z), numbers (0-9), and periods (.) are allowed.',
          );
        }
      }
    }
    if (phone) {
      const phoneTrimmed = phone.trim();
      if (!/^\d{10}$/.test(phoneTrimmed)) {
        throw new BadRequestException('Phone number must be exactly 10 digits.');
      }
    }
  }

  async createCandidate(dto: CreateCandidateDto) {
    if (dto.email) {
      dto.email = dto.email.toLowerCase().trim();
    }
    if (dto.phone) {
      dto.phone = dto.phone.trim();
    }

    this.validateCandidateContactInfo(dto.email, dto.phone);

    // Duplicate email check (case-insensitive)
    const existingEmail = await this.prisma.candidate.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });
    if (existingEmail) {
      throw new ConflictException('Candidate with this email already exists.');
    }

    // Duplicate phone check
    if (dto.phone) {
      const existingPhone = await this.prisma.candidate.findFirst({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException(
          'Candidate with this phone number already exists.',
        );
      }
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
    let emailStr: string | undefined;
    let phoneStr: string | undefined;

    if (data.email) {
      emailStr =
        typeof data.email === 'string'
          ? data.email.toLowerCase().trim()
          : (data.email as any).set?.toLowerCase().trim();
      if (emailStr) {
        (data as any).email = emailStr;
      }
    }

    if (data.phone) {
      phoneStr =
        typeof data.phone === 'string'
          ? data.phone.trim()
          : (data.phone as any).set?.trim();
      if (phoneStr) {
        (data as any).phone = phoneStr;
      }
    }

    this.validateCandidateContactInfo(emailStr, phoneStr);

    if (emailStr) {
      const existing = await this.prisma.candidate.findFirst({
        where: {
          email: { equals: emailStr, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          'Candidate with this email already exists.',
        );
      }
    }

    if (phoneStr) {
      const existingPhone = await this.prisma.candidate.findFirst({
        where: {
          phone: phoneStr,
          id: { not: id },
        },
      });
      if (existingPhone) {
        throw new ConflictException(
          'Candidate with this phone number already exists.',
        );
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

  async getSchedules(
    query: PaginationQueryDto & {
      status?: string;
      candidateId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const res = await this.recruitmentRepository.findManySchedules(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createSchedule(dto: CreateScheduleDto) {
    if (
      !dto.roundName?.trim() ||
      dto.roundName.trim() === '0' ||
      /^0+$/.test(dto.roundName.trim())
    ) {
      throw new BadRequestException('Round name cannot be 0 or empty.');
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduled interview date/time.');
    }

    // Verify chronological interview order: subsequent rounds must be after previous rounds
    const existingSchedules = await this.prisma.interviewSchedule.findMany({
      where: { candidateId: dto.candidateId },
      orderBy: { scheduledAt: 'desc' },
    });

    if (existingSchedules.length > 0) {
      const latestSchedule = existingSchedules[0];
      if (scheduledDate <= new Date(latestSchedule.scheduledAt)) {
        throw new BadRequestException(
          `Subsequent interview round must be scheduled after previous round "${latestSchedule.roundName}" (${new Date(latestSchedule.scheduledAt).toLocaleString()}).`,
        );
      }
    }

    const schedule = await this.recruitmentRepository.createSchedule(dto);
    // Auto-update candidate status in DB to INTERVIEWING when interview is scheduled
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: dto.candidateId },
    });
    if (
      candidate &&
      candidate.status !== 'SELECTED' &&
      candidate.status !== 'ACCEPTED'
    ) {
      await this.recruitmentRepository.updateCandidateStatus(
        dto.candidateId,
        'INTERVIEWING',
      );
    }
    return schedule;
  }

  async updateSchedule(id: string, data: Prisma.InterviewScheduleUpdateInput) {
    if (data.roundName !== undefined) {
      const val =
        typeof data.roundName === 'string'
          ? data.roundName
          : String(data.roundName);
      if (!val.trim() || val.trim() === '0' || /^0+$/.test(val.trim())) {
        throw new BadRequestException('Round name cannot be 0 or empty.');
      }
    }

    if (data.scheduledAt !== undefined) {
      const scheduledDate = new Date(data.scheduledAt as any);
      if (isNaN(scheduledDate.getTime())) {
        throw new BadRequestException('Invalid scheduled interview date/time.');
      }
      const existing = await this.prisma.interviewSchedule.findUnique({
        where: { id },
      });
      if (existing) {
        const otherSchedules = await this.prisma.interviewSchedule.findMany({
          where: { candidateId: existing.candidateId, id: { not: id } },
          orderBy: { attemptNumber: 'asc' },
        });

        const earlierSchedules = otherSchedules.filter(
          (s) => s.attemptNumber < existing.attemptNumber,
        );
        if (earlierSchedules.length > 0) {
          const latestEarlier = earlierSchedules[earlierSchedules.length - 1];
          if (scheduledDate <= new Date(latestEarlier.scheduledAt)) {
            throw new BadRequestException(
              `Interview round must be scheduled after previous round "${latestEarlier.roundName}" (${new Date(latestEarlier.scheduledAt).toLocaleString()}).`,
            );
          }
        }

        const laterSchedules = otherSchedules.filter(
          (s) => s.attemptNumber > existing.attemptNumber,
        );
        if (laterSchedules.length > 0) {
          const earliestLater = laterSchedules[0];
          if (scheduledDate >= new Date(earliestLater.scheduledAt)) {
            throw new BadRequestException(
              `Interview round must be scheduled before subsequent round "${earliestLater.roundName}" (${new Date(earliestLater.scheduledAt).toLocaleString()}).`,
            );
          }
        }
      }
    }

    return this.recruitmentRepository.updateSchedule(id, data);
  }

  async deleteSchedule(id: string) {
    return this.recruitmentRepository.deleteSchedule(id);
  }

  // ---------------------------------------------------------------------------
  // 4. Panel Feedback
  // ---------------------------------------------------------------------------

  async createFeedback(dto: CreateFeedbackDto) {
    const schedule = await this.prisma.interviewSchedule.findUnique({
      where: { id: dto.scheduleId },
      include: { feedbacks: true },
    });
    if (!schedule) {
      throw new NotFoundException('Interview schedule not found.');
    }
    const now = new Date();
    if (new Date(schedule.scheduledAt) > now) {
      throw new BadRequestException(
        'Feedback cannot be submitted before the scheduled interview time.',
      );
    }

    // Prevent duplicate feedbacks by the same panelist for the same interview round
    const existingFeedback = schedule.feedbacks?.find((f) => {
      if (dto.panelistId && f.panelistId) {
        return f.panelistId === dto.panelistId;
      }
      return (
        f.panelistName?.trim().toLowerCase() ===
        dto.panelistName?.trim().toLowerCase()
      );
    });

    let feedback;
    if (existingFeedback) {
      feedback = await this.recruitmentRepository.updateFeedback(
        existingFeedback.id,
        {
          panelistName: dto.panelistName,
          panelistId: dto.panelistId || null,
          rating: Number(dto.rating),
          comments: dto.comments,
          recommendation: dto.recommendation as any,
        },
      );
      this.logger.log(
        `Interview feedback updated for schedule id=${dto.scheduleId} by ${dto.panelistName}`,
      );
    } else {
      feedback = await this.recruitmentRepository.createFeedback(dto);
      this.logger.log(
        `Interview feedback recorded for schedule id=${dto.scheduleId} by ${dto.panelistName}`,
      );
    }

    // Atomically mark the schedule as COMPLETED after feedback is captured
    await this.recruitmentRepository.updateScheduleStatus(
      dto.scheduleId,
      'COMPLETED',
    );
    return feedback;
  }

  async updateFeedback(id: string, data: any) {
    if (data.scheduleId) {
      const schedule = await this.prisma.interviewSchedule.findUnique({
        where: { id: data.scheduleId },
      });
      if (schedule && new Date(schedule.scheduledAt) > new Date()) {
        throw new BadRequestException(
          'Feedback cannot be submitted before the scheduled interview time.',
        );
      }
    }
    const updated = await this.recruitmentRepository.updateFeedback(id, data);
    this.logger.log(`Interview feedback updated: id=${id}`);
    return updated;
  }

  async deleteFeedback(id: string) {
    await this.recruitmentRepository.deleteFeedback(id);
    this.logger.log(`Interview feedback deleted: id=${id}`);
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
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: dto.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found.');
    }
    if (
      candidate.status !== 'SELECTED' &&
      candidate.status !== 'OFFERED' &&
      candidate.status !== 'ACCEPTED'
    ) {
      throw new BadRequestException(
        'Offer letters can only be generated for candidates with status SELECTED.',
      );
    }

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
        const candEmail = offer.candidate.email
          ? offer.candidate.email.toLowerCase().trim()
          : '';
        const existingEmp = await tx.employee.findUnique({
          where: { email: candEmail },
        });
        if (existingEmp) {
          // If employee already exists, just update candidate status and return gracefully
          await tx.candidate.update({
            where: { id: offer.candidateId },
            data: { status: 'ACCEPTED' },
          });
          return { offer, employee: existingEmp };
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
        let dept = await tx.department.findFirst({
          where: {
            name: { equals: DEFAULT_EMPLOYEE_DEPARTMENT, mode: 'insensitive' },
          },
        });
        if (!dept) {
          dept = await tx.department.findFirst();
        }
        if (!dept) {
          dept = await tx.department.create({
            data: { name: DEFAULT_EMPLOYEE_DEPARTMENT },
          });
        }

        const employee = await tx.employee.create({
          data: {
            employeeId: empId,
            firstName,
            lastName,
            email: candEmail,
            phone: offer.candidate?.phone || null,
            location: (offer as any)?.location || 'Vadodara Plant',
            departmentId: dept.id,
            designation: offer.role,
            dateOfJoining: joiningDate,
            totalExperienceYears:
              Number((offer.candidate as any)?.experienceYears) || 0.0,
            status: 'ONBOARDING',
            probationEnd,
            qrToken: randomUUID(),
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
    } catch (err: any) {
      this.logger.error(
        `[acceptOffer] Transaction failed for offerId=${offerId}: ${err?.message}`,
        err?.stack,
      );
      throw new InternalServerErrorException(
        err?.message || 'Failed to complete offer acceptance. Please retry.',
      );
    }
  }

  // Fiscal Years
  async getFiscalYears(query: PaginationQueryDto = {}) {
    return this.recruitmentRepository.findManyFiscalYears(query);
  }

  async createFiscalYear(data: { name: string; isActive?: boolean }) {
    if (!data.name?.trim())
      throw new BadRequestException('Financial Year name is required');
    const nameStr = data.name.trim();
    const existing = await this.prisma.fiscalYear.findFirst({
      where: { name: { equals: nameStr, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(
        'Financial Year with this name already exists.',
      );
    }
    return this.recruitmentRepository.createFiscalYear({
      name: nameStr,
      isActive: data.isActive,
    });
  }

  async updateFiscalYear(
    id: string,
    data: { name?: string; isActive?: boolean },
  ) {
    if (data.name?.trim()) {
      const nameStr = data.name.trim();
      const existing = await this.prisma.fiscalYear.findFirst({
        where: {
          name: { equals: nameStr, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          'Financial Year with this name already exists.',
        );
      }
    }
    return this.recruitmentRepository.updateFiscalYear(id, data);
  }

  async deleteFiscalYear(id: string) {
    const fy = await this.prisma.fiscalYear.findUnique({ where: { id } });
    if (!fy) return;

    let lmCount = 0;
    try {
      lmCount = await this.prisma.departmentLeaveMaster.count({
        where: {
          OR: [
            { fiscalYearId: id },
            { fiscalYear: { name: { equals: fy.name, mode: 'insensitive' } } },
          ],
        },
      });
    } catch (e) {}
    if (lmCount > 0) {
      throw new ConflictException(
        `Financial Year "${fy.name}" is already in use by Department Leave Master and cannot be deleted.`,
      );
    }

    try {
      return await this.recruitmentRepository.deleteFiscalYear(id);
    } catch (error) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new ConflictException(
          `Financial Year "${fy.name}" is already in use and cannot be deleted.`,
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // CNV Compliance Workflow
  // ---------------------------------------------------------------------------

  async getCnvDetails(requisitionId: string) {
    const req = await this.prisma.jobRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        department: true,
        cnvRecord: { include: { history: { orderBy: { createdAt: 'asc' } } } },
      },
    });
    if (!req) throw new NotFoundException('Requisition not found.');

    // Auto-create CnvRecord if it doesn't exist yet
    if (!req.cnvRecord) {
      await this.recruitmentRepository.findOrCreateCnvRecord(
        requisitionId,
        req.cnvExchangeOffice || null,
        'System',
      );
      // Re-fetch with the new record
      const updated = await this.prisma.jobRequisition.findUnique({
        where: { id: requisitionId },
        include: {
          department: true,
          cnvRecord: {
            include: { history: { orderBy: { createdAt: 'asc' } } },
          },
        },
      });
      return updated;
    }
    return req;
  }

  async generateCnvNotification(requisitionId: string, performedBy?: string) {
    const req = await this.prisma.jobRequisition.findUnique({
      where: { id: requisitionId },
      include: { department: true, cnvRecord: true },
    });
    if (!req) throw new NotFoundException('Requisition not found.');
    if (!req.isCnvApplicable)
      throw new BadRequestException(
        'CNV is not applicable for this requisition.',
      );

    const cnvRecord = await this.recruitmentRepository.findOrCreateCnvRecord(
      requisitionId,
      req.cnvExchangeOffice || null,
      performedBy || 'HR',
    );

    const fileName = `cnv-notification-${requisitionId}.pdf`;
    const uploadsDir = join(process.cwd(), 'uploads', 'cnv-documents');
    const filePath = join(uploadsDir, fileName);
    const documentUrl = `/uploads/cnv-documents/${fileName}`;

    try {
      await generateCnvNotificationPdf(filePath, {
        requisitionId: req.id,
        title: req.title,
        departmentName: req.department?.name || 'General',
        headcount: req.headcount,
        experienceRequired: req.experienceRequired,
        requisitionType: req.requisitionType,
        jobSpecification: req.jobSpecification,
        exchangeOffice: req.cnvExchangeOffice || 'District Employment Exchange',
        refNumber: req.cnvRefNumber,
      });
    } catch (pdfErr) {
      this.logger.warn(
        `Failed to generate CNV PDF file: ${(pdfErr as Error).message}`,
      );
    }

    await this.recruitmentRepository.updateCnvRecord(requisitionId, {
      notificationGeneratedAt: new Date(),
    });

    await this.recruitmentRepository.createCnvHistory(
      cnvRecord.id,
      'NOTIFICATION_GENERATED',
      `CNV Notification document generated for "${req.title}" (${req.department?.name || 'Dept'}).`,
      performedBy || 'HR Manager',
      {
        requisitionId,
        jobTitle: req.title,
        headcount: req.headcount,
        documentUrl,
      },
    );

    this.logger.log(
      `CNV notification generated for requisitionId=${requisitionId} by ${performedBy}`,
    );
    return {
      success: true,
      message: 'CNV notification generated successfully.',
      documentUrl,
    };
  }

  async recordCnvSubmission(
    requisitionId: string,
    dto: any,
    documentUrl?: string,
  ) {
    const req = await this.prisma.jobRequisition.findUnique({
      where: { id: requisitionId },
      include: { department: true, cnvRecord: true },
    });
    if (!req) throw new NotFoundException('Requisition not found.');
    if (!req.isCnvApplicable)
      throw new BadRequestException(
        'CNV is not applicable for this requisition.',
      );

    const cnvRecord = await this.recruitmentRepository.findOrCreateCnvRecord(
      requisitionId,
      req.cnvExchangeOffice || null,
      dto.submittedBy || 'HR',
    );

    if (
      cnvRecord.cnvStatus === 'NOTIFIED' ||
      cnvRecord.cnvStatus === 'ACKNOWLEDGED'
    ) {
      throw new BadRequestException(
        'CNV submission has already been recorded. Status is already NOTIFIED or ACKNOWLEDGED.',
      );
    }

    if (!dto.notificationDate) {
      throw new BadRequestException(
        'Notification date is required when recording submission.',
      );
    }
    if (!dto.submissionMode) {
      throw new BadRequestException('Submission mode is required.');
    }
    if (!dto.employmentExchangeOffice?.trim()) {
      throw new BadRequestException(
        'Employment Exchange / Authority name is required.',
      );
    }

    const updateData: any = {
      cnvStatus: 'NOTIFIED',
      employmentExchangeOffice: dto.employmentExchangeOffice,
      notificationDate: new Date(dto.notificationDate),
      submissionMode: dto.submissionMode,
      referenceNumber: dto.referenceNumber || null,
      cnvRemarks: dto.cnvRemarks || null,
      submittedBy: dto.submittedBy || null,
    };
    if (documentUrl) updateData.acknowledgementDocumentUrl = documentUrl;

    await this.recruitmentRepository.updateCnvRecord(requisitionId, updateData);

    // Sync JobRequisition cnvStatus string
    await this.prisma.jobRequisition.update({
      where: { id: requisitionId },
      data: {
        cnvStatus: 'NOTIFIED',
        cnvExchangeOffice: dto.employmentExchangeOffice,
        cnvNotificationDate: new Date(dto.notificationDate),
        cnvRefNumber: dto.referenceNumber || null,
      },
    });

    await this.recruitmentRepository.createCnvHistory(
      cnvRecord.id,
      'SUBMISSION_RECORDED',
      `CNV Submission recorded. Mode: ${dto.submissionMode}. Submitted to: ${dto.employmentExchangeOffice}.${dto.referenceNumber ? ` Reference: ${dto.referenceNumber}.` : ''}`,
      dto.submittedBy || 'HR Manager',
      {
        submissionMode: dto.submissionMode,
        referenceNumber: dto.referenceNumber,
        notificationDate: dto.notificationDate,
      },
    );

    this.logger.log(
      `CNV submission recorded for requisitionId=${requisitionId}, mode=${dto.submissionMode}`,
    );

    return this.recruitmentRepository.getCnvRecord(requisitionId);
  }

  async recordCnvAcknowledgement(
    requisitionId: string,
    dto: any,
    documentUrl?: string,
  ) {
    const req = await this.prisma.jobRequisition.findUnique({
      where: { id: requisitionId },
      include: { cnvRecord: true },
    });
    if (!req) throw new NotFoundException('Requisition not found.');
    if (!req.isCnvApplicable)
      throw new BadRequestException(
        'CNV is not applicable for this requisition.',
      );

    const cnvRecord =
      await this.recruitmentRepository.getCnvRecord(requisitionId);
    if (!cnvRecord) {
      throw new BadRequestException(
        'No CNV submission has been recorded. Please record submission before acknowledgement.',
      );
    }
    if (cnvRecord.cnvStatus !== 'NOTIFIED') {
      if (cnvRecord.cnvStatus === 'ACKNOWLEDGED') {
        throw new BadRequestException('CNV has already been acknowledged.');
      }
      throw new BadRequestException(
        'Cannot record acknowledgement before CNV notification has been submitted. Please record submission first.',
      );
    }

    if (!dto.acknowledgementNumber?.trim()) {
      throw new BadRequestException('Acknowledgement number is required.');
    }
    if (!dto.acknowledgementDate) {
      throw new BadRequestException('Acknowledgement date is required.');
    }

    // Validate acknowledgement date is not before notification date
    if (cnvRecord.notificationDate) {
      const ackDate = new Date(dto.acknowledgementDate);
      const notifDate = new Date(cnvRecord.notificationDate);
      if (ackDate < notifDate) {
        throw new BadRequestException(
          'Acknowledgement date cannot be before the notification/submission date.',
        );
      }
    }

    const updateData: any = {
      cnvStatus: 'ACKNOWLEDGED',
      acknowledgementNumber: dto.acknowledgementNumber,
      acknowledgementDate: new Date(dto.acknowledgementDate),
      cnvRemarks: dto.cnvRemarks || cnvRecord.cnvRemarks || null,
      acknowledgedBy: dto.acknowledgedBy || null,
    };
    if (documentUrl) updateData.acknowledgementDocumentUrl = documentUrl;

    await this.recruitmentRepository.updateCnvRecord(requisitionId, updateData);

    // Sync JobRequisition cnvStatus string
    await this.prisma.jobRequisition.update({
      where: { id: requisitionId },
      data: {
        cnvStatus: 'ACKNOWLEDGED',
        cnvRefNumber: dto.acknowledgementNumber,
      },
    });

    await this.recruitmentRepository.createCnvHistory(
      cnvRecord.id,
      'ACKNOWLEDGEMENT_RECORDED',
      `CNV Acknowledgement received. Acknowledgement No: ${dto.acknowledgementNumber}.${dto.cnvRemarks ? ` Remarks: ${dto.cnvRemarks}.` : ''}`,
      dto.acknowledgedBy || 'HR Manager',
      {
        acknowledgementNumber: dto.acknowledgementNumber,
        acknowledgementDate: dto.acknowledgementDate,
      },
    );

    this.logger.log(
      `CNV acknowledged for requisitionId=${requisitionId}, ackNo=${dto.acknowledgementNumber}`,
    );

    return this.recruitmentRepository.getCnvRecord(requisitionId);
  }
}
