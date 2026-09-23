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
import {
  RecordCnvSubmissionDto,
  RecordCnvAcknowledgementDto,
} from '../dto/cnv.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { generateOfferLetterPdf } from '../services/pdf-generator.helper';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('recruitment')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post('candidates/upload-resume')
  @RequirePermission('create', 'recruitment')
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
  @RequirePermission('read', 'department')
  async getDepartments(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getDepartments(query);
  }

  @Post('departments')
  @RequirePermission('create', 'department')
  async createDepartment(@Body() body: { name: string; isActive?: boolean }) {
    return this.recruitmentService.createDepartment(body.name, body.isActive);
  }

  @Patch('departments/:id')
  @RequirePermission('update', 'department')
  async updateDepartment(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.recruitmentService.updateDepartment(
      id,
      body.name,
      body.isActive,
    );
  }

  @Delete('departments/:id')
  @RequirePermission('delete', 'department')
  async deleteDepartment(@Param('id') id: string) {
    return this.recruitmentService.deleteDepartment(id);
  }

  // Training Types
  @Get('trainingTypes')
  @RequirePermission('read', 'training')
  async getTrainingTypesLegacy(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getTrainingTypes(query);
  }

  @Get('training-types')
  @RequirePermission('read', 'training')
  async getTrainingTypes(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getTrainingTypes(query);
  }

  @Post('trainingTypes')
  @RequirePermission('create', 'training')
  async createTrainingTypeLegacy(
    @Body() body: { name: string; isActive?: boolean },
  ) {
    return this.recruitmentService.createTrainingType(body.name, body.isActive);
  }

  @Post('training-types')
  @RequirePermission('create', 'training')
  async createTrainingType(@Body() body: { name: string; isActive?: boolean }) {
    return this.recruitmentService.createTrainingType(body.name, body.isActive);
  }

  @Patch('trainingTypes/:id')
  @RequirePermission('update', 'training')
  async updateTrainingTypeLegacy(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.recruitmentService.updateTrainingType(
      id,
      body.name,
      body.isActive,
    );
  }

  @Patch('training-types/:id')
  @RequirePermission('update', 'training')
  async updateTrainingType(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.recruitmentService.updateTrainingType(
      id,
      body.name,
      body.isActive,
    );
  }

  @Delete('trainingTypes/:id')
  @RequirePermission('delete', 'training')
  async deleteTrainingTypeLegacy(@Param('id') id: string) {
    return this.recruitmentService.deleteTrainingType(id);
  }

  @Delete('training-types/:id')
  @RequirePermission('delete', 'training')
  async deleteTrainingType(@Param('id') id: string) {
    return this.recruitmentService.deleteTrainingType(id);
  }

  // Interview Rounds Master
  @Get('interview-rounds')
  @RequirePermission('read', 'interview_rounds')
  async getInterviewRounds(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getInterviewRounds(query);
  }

  @Get('interviewRounds')
  @RequirePermission('read', 'interview_rounds')
  async getInterviewRoundsAlias(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getInterviewRounds(query);
  }

  @Post('interview-rounds')
  @RequirePermission('create', 'interview_rounds')
  async createInterviewRound(
    @Body()
    body: {
      name: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    return this.recruitmentService.createInterviewRound(
      body.name,
      body.description,
      body.order,
      body.isActive,
    );
  }

  @Post('interviewRounds')
  @RequirePermission('create', 'interview_rounds')
  async createInterviewRoundAlias(
    @Body()
    body: {
      name: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    return this.recruitmentService.createInterviewRound(
      body.name,
      body.description,
      body.order,
      body.isActive,
    );
  }

  @Patch('interview-rounds/:id')
  @RequirePermission('update', 'interview_rounds')
  async updateInterviewRound(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    return this.recruitmentService.updateInterviewRound(
      id,
      body.name,
      body.description,
      body.order,
      body.isActive,
    );
  }

  @Patch('interviewRounds/:id')
  @RequirePermission('update', 'interview_rounds')
  async updateInterviewRoundAlias(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    return this.recruitmentService.updateInterviewRound(
      id,
      body.name,
      body.description,
      body.order,
      body.isActive,
    );
  }

  @Delete('interview-rounds/:id')
  @RequirePermission('delete', 'interview_rounds')
  async deleteInterviewRound(@Param('id') id: string) {
    return this.recruitmentService.deleteInterviewRound(id);
  }

  @Delete('interviewRounds/:id')
  @RequirePermission('delete', 'interview_rounds')
  async deleteInterviewRoundAlias(@Param('id') id: string) {
    return this.recruitmentService.deleteInterviewRound(id);
  }

  // 1. Requisitions & Replacement Employees
  @Get('employees')
  @RequirePermission('read', 'employee')
  async getEmployeesForReplacement() {
    return this.recruitmentService.getEmployeesForReplacement();
  }

  @Get('requisitions')
  @RequirePermission('read', 'recruitment')
  async getRequisitions(
    @Query()
    query: PaginationQueryDto & { status?: string; departmentId?: string },
  ) {
    return this.recruitmentService.getRequisitions(query);
  }

  @Post('requisitions')
  @RequirePermission('create', 'recruitment')
  async createRequisition(@Body() dto: CreateRequisitionDto) {
    return this.recruitmentService.createRequisition(dto);
  }

  @Patch('requisitions/:id/status')
  @RequirePermission('update', 'recruitment')
  async updateRequisitionStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.recruitmentService.updateRequisitionStatus(id, status);
  }

  @Patch('requisitions/:id')
  @RequirePermission('update', 'recruitment')
  async updateRequisition(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateRequisition(id, body);
  }

  @Delete('requisitions/:id')
  @RequirePermission('delete', 'recruitment')
  async deleteRequisition(@Param('id') id: string) {
    return this.recruitmentService.deleteRequisition(id);
  }

  // 2. Candidates
  @Get('candidates')
  @RequirePermission('read', 'recruitment')
  async getCandidates(
    @Query()
    query: PaginationQueryDto & { status?: string; requisitionId?: string },
  ) {
    return this.recruitmentService.getCandidates(query);
  }

  @Post('candidates')
  @RequirePermission('create', 'recruitment')
  async createCandidate(@Body() dto: CreateCandidateDto) {
    return this.recruitmentService.createCandidate(dto);
  }

  @Patch('candidates/:id/status')
  @RequirePermission('update', 'recruitment')
  async updateCandidateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.recruitmentService.updateCandidateStatus(id, status);
  }

  @Patch('candidates/:id')
  @RequirePermission('update', 'recruitment')
  async updateCandidate(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateCandidate(id, body);
  }

  @Delete('candidates/:id')
  @RequirePermission('delete', 'recruitment')
  async deleteCandidate(@Param('id') id: string) {
    return this.recruitmentService.deleteCandidate(id);
  }

  // 3. Scheduling
  @Get('interview-panelists')
  @RequirePermission('read', 'recruitment')
  async getInterviewPanelists() {
    return this.recruitmentService.getInterviewPanelists();
  }

  @Get('panelists')
  @RequirePermission('read', 'recruitment')
  async getPanelistsAlias() {
    return this.recruitmentService.getInterviewPanelists();
  }

  @Get('schedules')
  @RequirePermission('read', 'recruitment')
  async getSchedules(
    @Query()
    query: PaginationQueryDto & {
      status?: string;
      candidateId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.recruitmentService.getSchedules(query);
  }

  @Post('schedules')
  @RequirePermission('create', 'recruitment')
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.recruitmentService.createSchedule(dto);
  }

  @Patch('schedules/:id')
  @RequirePermission('update', 'recruitment')
  async updateSchedule(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateSchedule(id, body);
  }

  @Delete('schedules/:id')
  @RequirePermission('delete', 'recruitment')
  async deleteSchedule(@Param('id') id: string) {
    return this.recruitmentService.deleteSchedule(id);
  }

  // 4. Feedback
  @Post('feedbacks')
  @RequirePermission('create', 'recruitment')
  async createFeedback(@Body() dto: CreateFeedbackDto) {
    return this.recruitmentService.createFeedback(dto);
  }

  @Patch('feedbacks/:id')
  @RequirePermission('update', 'recruitment')
  async updateFeedback(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateFeedback(id, body);
  }

  @Delete('feedbacks/:id')
  @RequirePermission('delete', 'recruitment')
  async deleteFeedback(@Param('id') id: string) {
    return this.recruitmentService.deleteFeedback(id);
  }

  // 5. Offers
  @Get('offers')
  @RequirePermission('read', 'recruitment')
  async getOffers(@Query() query: PaginationQueryDto & { status?: string }) {
    return this.recruitmentService.getOffers(query);
  }

  @Post('offers')
  @RequirePermission('create', 'recruitment')
  async createOffer(@Body() dto: CreateOfferDto) {
    return this.recruitmentService.createOffer(dto);
  }

  @Patch('offers/:id')
  @RequirePermission('update', 'recruitment')
  async updateOffer(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateOffer(id, body);
  }

  @Delete('offers/:id')
  @RequirePermission('delete', 'recruitment')
  async deleteOffer(@Param('id') id: string) {
    return this.recruitmentService.deleteOffer(id);
  }

  @Get('offers/:id/pdf')
  @RequirePermission('export', 'recruitment')
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
  @RequirePermission('update', 'recruitment')
  async acceptOffer(@Param('id') id: string) {
    return this.recruitmentService.acceptOffer(id);
  }

  // 6. Fiscal Years (Financial Year Master)
  @Get('fiscal-years')
  @RequirePermission('read', 'recruitment')
  async getFiscalYears(@Query() query: PaginationQueryDto) {
    return this.recruitmentService.getFiscalYears(query);
  }

  @Post('fiscal-years')
  @RequirePermission('create', 'recruitment')
  async createFiscalYear(@Body() body: { name: string; isActive?: boolean }) {
    return this.recruitmentService.createFiscalYear(body);
  }

  @Patch('fiscal-years/:id')
  @RequirePermission('update', 'recruitment')
  async updateFiscalYear(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.recruitmentService.updateFiscalYear(id, body);
  }

  @Delete('fiscal-years/:id')
  @RequirePermission('delete', 'recruitment')
  async deleteFiscalYear(@Param('id') id: string) {
    return this.recruitmentService.deleteFiscalYear(id);
  }

  // ---------------------------------------------------------------------------
  // 7. CNV Compliance Workflow
  // ---------------------------------------------------------------------------

  @Get('requisitions/:id/cnv')
  @RequirePermission('read', 'recruitment')
  async getCnvDetails(@Param('id') id: string) {
    return this.recruitmentService.getCnvDetails(id);
  }

  @Post('requisitions/:id/cnv/generate')
  @RequirePermission('update', 'recruitment')
  async generateCnvNotification(
    @Param('id') id: string,
    @Body() body: { performedBy?: string },
  ) {
    return this.recruitmentService.generateCnvNotification(
      id,
      body?.performedBy,
    );
  }

  @Post('requisitions/:id/cnv/submit')
  @RequirePermission('update', 'recruitment')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'cnv-documents');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `cnv-submission-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PDF files are allowed for CNV documents.',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async recordCnvSubmission(
    @Param('id') id: string,
    @Body() dto: RecordCnvSubmissionDto,
    @UploadedFile() file?: any,
  ) {
    const documentUrl = file
      ? `/uploads/cnv-documents/${file.filename}`
      : undefined;
    return this.recruitmentService.recordCnvSubmission(id, dto, documentUrl);
  }

  @Post('requisitions/:id/cnv/acknowledge')
  @RequirePermission('update', 'recruitment')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'cnv-documents');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `cnv-ack-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PDF files are allowed for CNV documents.',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async recordCnvAcknowledgement(
    @Param('id') id: string,
    @Body() dto: RecordCnvAcknowledgementDto,
    @UploadedFile() file?: any,
  ) {
    const documentUrl = file
      ? `/uploads/cnv-documents/${file.filename}`
      : undefined;
    return this.recruitmentService.recordCnvAcknowledgement(
      id,
      dto,
      documentUrl,
    );
  }
}
