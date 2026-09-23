import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PerformanceService } from '../services/performance.service';
import { CreateAppraisalCycleDto } from '../dto/create-cycle.dto';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { CreateReviewDto } from '../dto/create-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('performance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('appraisal-cycles')
  @RequirePermission('read', 'performance')
  async getAppraisalCycles(
    @Query() query: PaginationQueryDto & { status?: string },
  ) {
    return this.performanceService.getAppraisalCycles(query);
  }

  @Post('appraisal-cycles')
  @RequirePermission('create', 'performance')
  async createAppraisalCycle(@Body() dto: CreateAppraisalCycleDto) {
    return this.performanceService.createAppraisalCycle(dto);
  }

  @Patch('appraisal-cycles/:id')
  @RequirePermission('update', 'performance')
  async updateAppraisalCycle(@Body() body: any, @Param('id') id: string) {
    return this.performanceService.updateAppraisalCycle(id, body);
  }

  @Delete('appraisal-cycles/:id')
  @RequirePermission('delete', 'performance')
  async deleteAppraisalCycle(@Param('id') id: string) {
    return this.performanceService.deleteAppraisalCycle(id);
  }

  @Get('goals')
  @RequirePermission('read', 'performance')
  async getGoals(
    @Query()
    query: PaginationQueryDto & {
      employeeId?: string;
      cycleId?: string;
      status?: string;
    },
  ) {
    return this.performanceService.getGoals(query);
  }

  @Post('goals')
  @RequirePermission('create', 'performance')
  async createGoal(@Body() dto: CreateGoalDto) {
    return this.performanceService.createGoal(dto);
  }

  @Patch('goals/:id')
  @RequirePermission('update', 'performance')
  async updateGoal(@Body() body: any, @Param('id') id: string) {
    return this.performanceService.updateGoal(id, body);
  }

  @Delete('goals/:id')
  @RequirePermission('delete', 'performance')
  async deleteGoal(@Param('id') id: string) {
    return this.performanceService.deleteGoal(id);
  }

  @Get('reviews')
  @RequirePermission('read', 'performance')
  async getReviews(
    @Query()
    query: PaginationQueryDto & {
      employeeId?: string;
      cycleId?: string;
      status?: string;
    },
  ) {
    return this.performanceService.getReviews(query);
  }

  @Post('reviews')
  @RequirePermission('create', 'performance')
  async createOrUpdateReview(@Body() dto: CreateReviewDto) {
    return this.performanceService.createOrUpdateReview(dto);
  }

  @Patch('reviews/:id')
  @RequirePermission('update', 'performance')
  async updateReview(@Body() body: any, @Param('id') id: string) {
    return this.performanceService.updateReview(id, body);
  }

  @Delete('reviews/:id')
  @RequirePermission('delete', 'performance')
  async deleteReview(@Param('id') id: string) {
    return this.performanceService.deleteReview(id);
  }
}
