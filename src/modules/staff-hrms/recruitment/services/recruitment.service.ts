import { Injectable } from '@nestjs/common';
import { RecruitmentRepository } from '../repositories/recruitment.repository';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { generateOfferLetterPdf } from './pdf-generator.helper';
import { join } from 'path';

@Injectable()
export class RecruitmentService {
  constructor(private readonly recruitmentRepository: RecruitmentRepository) { }

  // 0. Departments
  async getDepartments() {
    return this.recruitmentRepository.findManyDepartments();
  }

  async createDepartment(name: string) {
    return this.recruitmentRepository.createDepartment(name);
  }

  async updateDepartment(id: string, name: string) {
    return this.recruitmentRepository.updateDepartment(id, name);
  }

  async deleteDepartment(id: string) {
    return this.recruitmentRepository.deleteDepartment(id);
  }

  // 1. Job Requisition
  async getRequisitions(page: number, limit: number, search?: string, status?: string) {
    return this.recruitmentRepository.findManyRequisitions(page, limit, search, status);
  }

  async createRequisition(dto: CreateRequisitionDto) {
    return this.recruitmentRepository.createRequisition(dto);
  }

  async updateRequisitionStatus(id: string, status: string) {
    return this.recruitmentRepository.updateRequisitionStatus(id, status);
  }

  async updateRequisition(id: string, data: any) {
    return this.recruitmentRepository.updateRequisition(id, data);
  }

  async deleteRequisition(id: string) {
    return this.recruitmentRepository.deleteRequisition(id);
  }

  // 2. Candidate Sourcing & Applications
  async getCandidates(page: number, limit: number, search?: string, status?: string) {
    return this.recruitmentRepository.findManyCandidates(page, limit, search, status);
  }

  async createCandidate(dto: CreateCandidateDto) {
    return this.recruitmentRepository.createCandidate(dto);
  }

  async updateCandidateStatus(id: string, status: string) {
    return this.recruitmentRepository.updateCandidateStatus(id, status);
  }

  async updateCandidate(id: string, data: any) {
    return this.recruitmentRepository.updateCandidate(id, data);
  }

  async deleteCandidate(id: string) {
    return this.recruitmentRepository.deleteCandidate(id);
  }

  // 3. Interview Scheduling
  async getSchedules() {
    return this.recruitmentRepository.findManySchedules();
  }

  async createSchedule(dto: CreateScheduleDto) {
    return this.recruitmentRepository.createSchedule(dto);
  }

  async updateSchedule(id: string, data: any) {
    return this.recruitmentRepository.updateSchedule(id, data);
  }

  async deleteSchedule(id: string) {
    return this.recruitmentRepository.deleteSchedule(id);
  }

  // 4. Panel Feedback
  async createFeedback(dto: CreateFeedbackDto) {
    const feedback = await this.recruitmentRepository.createFeedback(dto);
    await this.recruitmentRepository.updateScheduleStatus(dto.scheduleId, 'COMPLETED');
    return feedback;
  }

  // 5. Offer Letter
  async getOffers() {
    return this.recruitmentRepository.findManyOffers();
  }

  async getOfferById(id: string) {
    return this.recruitmentRepository.findOfferById(id);
  }

  async createOffer(dto: CreateOfferDto) {
    const offer = await this.recruitmentRepository.createOffer(dto);
    // After creating the offer in DB, dynamically generate the PDF
    try {
      const fullOffer = await this.recruitmentRepository.findOfferById(offer.id);
      if (fullOffer && fullOffer.candidate) {
        const filePath = join(process.cwd(), 'uploads', 'offers', `offer-${offer.id}.pdf`);
        await generateOfferLetterPdf(filePath, {
          candidateName: fullOffer.candidate.name,
          candidateEmail: fullOffer.candidate.email,
          role: fullOffer.role,
          salary: fullOffer.salary,
          joiningDate: fullOffer.joiningDate,
        });
      } else {
        console.warn('[OfferService] Candidate not found, skipping PDF generation.');
      }
    } catch (err) {
      console.error('[OfferService] Failed to generate offer letter PDF:', err);
    }

    return offer;
  }

  async updateOffer(id: string, data: any) {
    return this.recruitmentRepository.updateOffer(id, data);
  }

  async deleteOffer(id: string) {
    return this.recruitmentRepository.deleteOffer(id);
  }

  async acceptOffer(id: string) {
    const offer = await this.recruitmentRepository.updateOfferStatus(id, 'ACCEPTED');
    await this.recruitmentRepository.updateCandidateStatus(offer.candidateId, 'ACCEPTED');

    // Automatically create onboarding Employee profile with aspino_2026_001 format
    const year = new Date(offer.joiningDate || new Date()).getFullYear();
    const nextSeq = await this.recruitmentRepository.getNextEmployeeSequence(year);
    const empId = `aspino_${year}_${String(nextSeq).padStart(3, '0')}`;

    const [firstName, ...lastNameParts] = offer.candidate.name.split(' ');
    const lastName = lastNameParts.join(' ') || 'Candidate';

    const employee = await this.recruitmentRepository.createEmployee({
      employeeId: empId,
      firstName,
      lastName,
      email: offer.candidate.email,
      department: 'Production',
      designation: offer.role,
      dateOfJoining: offer.joiningDate,
      status: 'ONBOARDING',
      probationEnd: new Date(new Date(offer.joiningDate).setMonth(new Date(offer.joiningDate).getMonth() + 6)),
    });

    // Create document checklist: ID proof, address proof, educational certificates, previous employment documents
    const docs = ['ID Proof', 'Address Proof', 'Educational Certificates', 'Previous Employment Documents'];
    await this.recruitmentRepository.createOnboardingDocuments(
      docs.map((doc) => ({
        employeeId: employee.id,
        documentType: doc,
        status: 'PENDING',
      })),
    );

    return { offer, employee };
  }
}
