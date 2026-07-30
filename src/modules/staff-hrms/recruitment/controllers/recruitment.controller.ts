import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile, BadRequestException, Res, NotFoundException, Query } from '@nestjs/common';
import { RecruitmentService } from '../services/recruitment.service';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { generateOfferLetterPdf } from '../services/pdf-generator.helper';

@Controller('staff-hrms/recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post('candidates/upload-resume')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/resumes',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `resume-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async uploadResume(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return { url: `/uploads/resumes/${file.filename}` };
  }

  // 0. Departments
  @Get('departments')
  async getDepartments() {
    return this.recruitmentService.getDepartments();
  }

  @Post('departments')
  async createDepartment(@Body('name') name: string) {
    return this.recruitmentService.createDepartment(name);
  }

  @Patch('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body('name') name: string) {
    return this.recruitmentService.updateDepartment(id, name);
  }

  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string) {
    return this.recruitmentService.deleteDepartment(id);
  }

  // 1. Requisitions
  @Get('requisitions')
  async getRequisitions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.recruitmentService.getRequisitions(pageNum, limitNum, search, status);
  }

  @Post('requisitions')
  async createRequisition(@Body() dto: CreateRequisitionDto) {
    return this.recruitmentService.createRequisition(dto);
  }

  @Patch('requisitions/:id/status')
  async updateRequisitionStatus(@Param('id') id: string, @Body('status') status: string) {
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
  async getCandidates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.recruitmentService.getCandidates(pageNum, limitNum, search, status);
  }

  @Post('candidates')
  async createCandidate(@Body() dto: CreateCandidateDto) {
    return this.recruitmentService.createCandidate(dto);
  }

  @Patch('candidates/:id/status')
  async updateCandidateStatus(@Param('id') id: string, @Body('status') status: string) {
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
  async getSchedules() {
    return this.recruitmentService.getSchedules();
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

  // 5. Offers
  @Get('offers')
  async getOffers() {
    return this.recruitmentService.getOffers();
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
    const filePath = join(process.cwd(), 'uploads', 'offers', `offer-${offer.id}.pdf`);

    // Dynamically regenerate the PDF on every request to ensure it uses the redesigned layout
    await generateOfferLetterPdf(filePath, {
      candidateName: offer.candidate.name,
      candidateEmail: offer.candidate.email,
      role: offer.role,
      salary: offer.salary,
      joiningDate: offer.joiningDate,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="offer-${offer.id}.pdf"`);
    res.sendFile(filePath);
  }

  @Post('offers/:id/accept')
  async acceptOffer(@Param('id') id: string) {
    return this.recruitmentService.acceptOffer(id);
  }
}
