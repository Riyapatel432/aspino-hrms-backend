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
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

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

@Controller('onboarding')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('employees')
  @RequirePermission('read', 'onboarding')
  async getEmployees(
    @Query()
    query: PaginationQueryDto & { status?: string; department?: string },
  ) {
    return this.onboardingService.getEmployees(query);
  }

  @Get('banks')
  @RequirePermission('read', 'onboarding')
  async getBanks() {
    return this.onboardingService.getBanks();
  }

  @Patch('documents/:id/status')
  @RequirePermission('update', 'onboarding')
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.onboardingService.updateDocumentStatus(id, status);
  }

  @Post('documents/:id/upload')
  @RequirePermission('create', 'onboarding')
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
  @RequirePermission('create', 'onboarding')
  async createInduction(
    @Body() body: { employeeId: string; scheduledAt: string; trainer: string },
  ) {
    return this.onboardingService.createInduction(body);
  }

  @Patch('inductions/:id/status')
  @RequirePermission('update', 'onboarding')
  async updateInductionStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.onboardingService.updateInductionStatus(id, status);
  }

  @Patch('employees/:id/probation')
  @RequirePermission('update', 'onboarding')
  async updateProbation(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.onboardingService.updateProbation(id, status);
  }

  @Patch('employees/:id/system-access')
  @RequirePermission('update', 'onboarding')
  async updateSystemAccess(
    @Param('id') employeeId: string,
    @Body() body: UpdateSystemAccessDto,
  ) {
    return this.onboardingService.updateSystemAccess(employeeId, body);
  }

  @Patch('employees/:id')
  @RequirePermission('update', 'onboarding')
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.onboardingService.updateEmployee(id, body);
  }

  @Delete('employees/:id')
  @RequirePermission('delete', 'onboarding')
  async deleteEmployee(@Param('id') id: string) {
    return this.onboardingService.deleteEmployee(id);
  }
}
