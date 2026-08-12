import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecruitmentService } from '../services/recruitment.service';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { generateOfferLetterPdf } from '../services/pdf-generator.helper';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';

@Controller('recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) { }

  @Post('candidates/upload-resume')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/resumes',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `resume-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadResume(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return { url: `/uploads/resumes/${file.filename}` };
  }

  // 0. Departments
  @Get('departments')
  async getDepartments(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getDepartments(query);
  }

  @Post('departments')
  async createDepartment(@Body() body: { name: string; isActive?: boolean }) {
    return this.recruitmentService.createDepartment(body.name, body.isActive);
  }

  @Patch('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }) {
    return this.recruitmentService.updateDepartment(id, body.name, body.isActive);
  }

  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string) {
    return this.recruitmentService.deleteDepartment(id);
  }

  // Training Types
  @Get('trainingTypes')
  async getTrainingTypesLegacy(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getTrainingTypes(query);
  }

  @Get('training-types')
  async getTrainingTypes(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getTrainingTypes(query);
  }

  @Post('trainingTypes')
  async createTrainingTypeLegacy(@Body() body: { name: string; isActive?: boolean }) {
    return this.recruitmentService.createTrainingType(body.name, body.isActive);
  }

  @Post('training-types')
  async createTrainingType(@Body() body: { name: string; isActive?: boolean }) {
    return this.recruitmentService.createTrainingType(body.name, body.isActive);
  }

  @Patch('trainingTypes/:id')
  async updateTrainingTypeLegacy(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.recruitmentService.updateTrainingType(id, body.name, body.isActive);
  }

  @Patch('training-types/:id')
  async updateTrainingType(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.recruitmentService.updateTrainingType(id, body.name, body.isActive);
  }

  @Delete('trainingTypes/:id')
  async deleteTrainingTypeLegacy(@Param('id') id: string) {
    return this.recruitmentService.deleteTrainingType(id);
  }

  @Delete('training-types/:id')
  async deleteTrainingType(@Param('id') id: string) {
    return this.recruitmentService.deleteTrainingType(id);
  }

  // 1. Requisitions
  @Get('requisitions')
  async getRequisitions(@Query() query: PaginationQueryDto & { status?: string; departmentId?: string }) {
    return this.recruitmentService.getRequisitions(query);
  }

  @Post('requisitions')
  async createRequisition(@Body() dto: CreateRequisitionDto) {
    return this.recruitmentService.createRequisition(dto);
  }

  @Patch('requisitions/:id/status')
  async updateRequisitionStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.recruitmentService.updateRequisitionStatus(id, status);
  }

  @Patch('requisitions/:id')
  async updateRequisition(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateRequisition(id, body);
  }

  @Delete('requisitions/:id')
  async deleteRequisition(@Param('id') id: string) {
    return this.recruitmentService.deleteRequisition(id);
  }

  // 2. Candidates
  @Get('candidates')
  async getCandidates(@Query() query: PaginationQueryDto & { status?: string; requisitionId?: string }) {
    return this.recruitmentService.getCandidates(query);
  }

  @Post('candidates')
  async createCandidate(@Body() dto: CreateCandidateDto) {
    return this.recruitmentService.createCandidate(dto);
  }

  @Patch('candidates/:id/status')
  async updateCandidateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.recruitmentService.updateCandidateStatus(id, status);
  }

  @Patch('candidates/:id')
  async updateCandidate(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateCandidate(id, body);
  }

  @Delete('candidates/:id')
  async deleteCandidate(@Param('id') id: string) {
    return this.recruitmentService.deleteCandidate(id);
  }

  // 3. Scheduling
  @Get('schedules')
  async getSchedules(@Query() query: PaginationQueryDto & { status?: string; candidateId?: string }) {
    return this.recruitmentService.getSchedules(query);
  }

  @Post('schedules')
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.recruitmentService.createSchedule(dto);
  }

  @Patch('schedules/:id')
  async updateSchedule(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateSchedule(id, body);
  }

  @Delete('schedules/:id')
  async deleteSchedule(@Param('id') id: string) {
    return this.recruitmentService.deleteSchedule(id);
  }

  // 4. Feedback
  @Post('feedbacks')
  async createFeedback(@Body() dto: CreateFeedbackDto) {
    return this.recruitmentService.createFeedback(dto);
  }

  @Patch('feedbacks/:id')
  async updateFeedback(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateFeedback(id, body);
  }

  @Delete('feedbacks/:id')
  async deleteFeedback(@Param('id') id: string) {
    return this.recruitmentService.deleteFeedback(id);
  }

  // 5. Offers
  @Get('offers')
  async getOffers(@Query() query: PaginationQueryDto & { status?: string }) {
    return this.recruitmentService.getOffers(query);
  }

  @Post('offers')
  async createOffer(@Body() dto: CreateOfferDto) {
    return this.recruitmentService.createOffer(dto);
  }

  @Patch('offers/:id')
  async updateOffer(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateOffer(id, body);
  }

  @Delete('offers/:id')
  async deleteOffer(@Param('id') id: string) {
    return this.recruitmentService.deleteOffer(id);
  }

  @Get('offers/:id/pdf')
  async downloadOfferPdf(@Param('id') id: string, @Res() res) {
    const offer = await this.recruitmentService.getOfferById(id);
    if (!offer) {
      throw new NotFoundException('Offer letter not found');
    }
    const dir = join(process.cwd(), 'uploads', 'offers');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = join(dir, `offer-${offer.id}.pdf`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore unlink error if locked
      }
    }

    // Dynamically regenerate fresh PDF with updated single-page layout
    await generateOfferLetterPdf(filePath, {
      candidateName: offer.candidate.name,
      candidateEmail: offer.candidate.email,
      role: offer.role,
      salary: offer.salary,
      joiningDate: offer.joiningDate,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="offer-${offer.id}.pdf"`,
    );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(filePath);
  }

  @Post('offers/:id/accept')
  async acceptOffer(@Param('id') id: string) {
    return this.recruitmentService.acceptOffer(id);
  }

  // 6. Fiscal Years (Financial Year Master)
  @Get('fiscal-years')
  async getFiscalYears(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getFiscalYears(query);
  }

  @Post('fiscal-years')
  async createFiscalYear(@Body() body: { name: string; isActive?: boolean }) {
    return this.recruitmentService.createFiscalYear(body);
  }

  @Patch('fiscal-years/:id')
  async updateFiscalYear(@Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }) {
    return this.recruitmentService.updateFiscalYear(id, body);
  }

  @Delete('fiscal-years/:id')
  async deleteFiscalYear(@Param('id') id: string) {
    return this.recruitmentService.deleteFiscalYear(id);
  }
}

