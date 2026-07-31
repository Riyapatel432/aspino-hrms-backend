import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';

@Injectable()
export class RecruitmentRepository {
  constructor(private readonly prisma: PrismaService) { }

  // Departments
  async findManyDepartments() {
    return this.prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(name: string) {
    return this.prisma.department.create({
      data: { name },
    });
  }

  async updateDepartment(id: string, name: string) {
    return this.prisma.department.update({
      where: { id },
      data: { name },
    });
  }

  async deleteDepartment(id: string) {
    return this.prisma.department.delete({
      where: { id },
    });
  }

  // Training Types
  async findManyTrainingTypes() {
    return this.prisma.trainingType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createTrainingType(name: string) {
    return this.prisma.trainingType.create({
      data: { name },
    });
  }

  async updateTrainingType(id: string, name: string) {
    return this.prisma.trainingType.update({
      where: { id },
      data: { name },
    });
  }

  async deleteTrainingType(id: string) {
    return this.prisma.trainingType.delete({
      where: { id },
    });
  }

  // Requisitions
  async findManyRequisitions(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { raisedBy: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [data, totalCount] = await this.prisma.$transaction([
      this.prisma.jobRequisition.findMany({
        where,
        skip,
        take: limit,
        include: { candidates: true, department: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobRequisition.count({ where }),
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

  async createRequisition(dto: CreateRequisitionDto) {
    return this.prisma.jobRequisition.create({
      data: dto,
    });
  }

  async updateRequisitionStatus(id: string, status: string) {
    return this.prisma.jobRequisition.update({
      where: { id },
      data: { status },
    });
  }

  async updateRequisition(id: string, data: any) {
    return this.prisma.jobRequisition.update({
      where: { id },
      data,
    });
  }

  async deleteRequisition(id: string) {
    // Delete related candidates first
    await this.prisma.candidate.deleteMany({ where: { requisitionId: id } });
    return this.prisma.jobRequisition.delete({
      where: { id },
    });
  }

  // Candidates
  async findManyCandidates(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [data, totalCount] = await this.prisma.$transaction([
      this.prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        include: {
          requisition: { include: { department: true } },
          schedules: { include: { feedbacks: true } },
          offer: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.candidate.count({ where }),
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

  async createCandidate(dto: CreateCandidateDto) {
    return this.prisma.candidate.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        resumeUrl: dto.resumeUrl || '',
        source: dto.source,
        requisitionId: dto.requisitionId,
      },
    });
  }

  async updateCandidateStatus(id: string, status: string) {
    return this.prisma.candidate.update({
      where: { id },
      data: { status },
    });
  }

  async updateCandidate(id: string, data: any) {
    return this.prisma.candidate.update({
      where: { id },
      data,
    });
  }

  async deleteCandidate(id: string) {
    // Delete related schedules and offers first
    await this.prisma.interviewSchedule.deleteMany({ where: { candidateId: id } });
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
  async findManySchedules() {
    return this.prisma.interviewSchedule.findMany({
      include: { candidate: true, feedbacks: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async createSchedule(dto: CreateScheduleDto) {
    return this.prisma.interviewSchedule.create({
      data: {
        candidateId: dto.candidateId,
        roundName: dto.roundName,
        scheduledAt: new Date(dto.scheduledAt),
        panelists: dto.panelists,
      },
    });
  }

  async updateScheduleStatus(id: string, status: string) {
    return this.prisma.interviewSchedule.update({
      where: { id },
      data: { status },
    });
  }

  async updateSchedule(id: string, data: any) {
    if (data.scheduledAt) {
      data.scheduledAt = new Date(data.scheduledAt);
    }
    return this.prisma.interviewSchedule.update({
      where: { id },
      data,
    });
  }

  async deleteSchedule(id: string) {
    // Delete feedbacks first
    await this.prisma.interviewFeedback.deleteMany({ where: { scheduleId: id } });
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
        rating: dto.rating,
        comments: dto.comments,
        recommendation: dto.recommendation,
      },
    });
  }

  // Offers
  async findManyOffers() {
    return this.prisma.offerLetter.findMany({
      include: { candidate: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOfferById(id: string) {
    return this.prisma.offerLetter.findUnique({
      where: { id },
      include: { candidate: true },
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
    });
  }

  async updateOfferStatus(id: string, status: string) {
    return this.prisma.offerLetter.update({
      where: { id },
      data: { status },
      include: { candidate: true },
    });
  }

  async updateOffer(id: string, data: any) {
    if (data.joiningDate) {
      data.joiningDate = new Date(data.joiningDate);
    }
    return this.prisma.offerLetter.update({
      where: { id },
      data,
    });
  }

  async deleteOffer(id: string) {
    return this.prisma.offerLetter.delete({
      where: { id },
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
}
