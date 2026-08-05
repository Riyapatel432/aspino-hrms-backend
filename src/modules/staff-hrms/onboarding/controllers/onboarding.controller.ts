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
  Query,
  UseGuards,
} from '@nestjs/common';
import { OnboardingService } from '../services/onboarding.service';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';

import { IsBoolean } from 'class-validator';

export class UpdateSystemAccessDto {
  @IsBoolean()
  erpLogin: boolean;

  @IsBoolean()
  email: boolean;

  @IsBoolean()
  attendanceApp: boolean;

  @IsBoolean()
  vpn: boolean;
}

@Controller('staff-hrms/onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) { }

  @Get('employees')
  async getEmployees(@Query() query: PaginationQueryDto & { status?: string; department?: string }) {
    return this.onboardingService.getEmployees(query);
  }

  @Patch('documents/:id/status')
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.onboardingService.updateDocumentStatus(id, status);
  }

  @Post('documents/:id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `doc-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadDocument(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const fileUrl = `/uploads/documents/${file.filename}`;
    return this.onboardingService.updateDocumentFileUrl(
      id,
      fileUrl,
      'SUBMITTED',
    );
  }

  @Post('inductions')
  async createInduction(
    @Body() body: { employeeId: string; scheduledAt: string; trainer: string },
  ) {
    return this.onboardingService.createInduction(body);
  }

  @Patch('inductions/:id/status')
  async updateInductionStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.onboardingService.updateInductionStatus(id, status);
  }

  @Patch('employees/:id/probation')
  async updateProbation(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.onboardingService.updateProbation(id, status);
  }

  @Patch('employees/:id/system-access')
  async updateSystemAccess(
    @Param('id') employeeId: string,
    @Body() body: UpdateSystemAccessDto,
  ) {
    return this.onboardingService.updateSystemAccess(employeeId, body);
  }

  @Patch('employees/:id')
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.onboardingService.updateEmployee(id, body);
  }

  @Delete('employees/:id')
  async deleteEmployee(@Param('id') id: string) {
    return this.onboardingService.deleteEmployee(id);
  }
}
