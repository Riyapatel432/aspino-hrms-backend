import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PerformanceService } from '../services/performance.service';
import { CreateAppraisalCycleDto } from '../dto/create-cycle.dto';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { CreateReviewDto } from '../dto/create-review.dto';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';

@Controller('staff-hrms/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('appraisal-cycles')
  async getAppraisalCycles() {
    return this.performanceService.getAppraisalCycles();
  }

  @Post('appraisal-cycles')
  async createAppraisalCycle(@Body() dto: CreateAppraisalCycleDto) {
    return this.performanceService.createAppraisalCycle(dto);
  }

  @Patch('appraisal-cycles/:id')
  async updateAppraisalCycle(@Body() body: any, @Param('id') id: string) {
    return this.performanceService.updateAppraisalCycle(id, body);
  }

  @Delete('appraisal-cycles/:id')
  async deleteAppraisalCycle(@Param('id') id: string) {
    return this.performanceService.deleteAppraisalCycle(id);
  }

  @Get('goals')
  async getGoals() {
    return this.performanceService.getGoals();
  }

  @Post('goals')
  async createGoal(@Body() dto: CreateGoalDto) {
    return this.performanceService.createGoal(dto);
  }

  @Patch('goals/:id')
  async updateGoal(@Body() body: any, @Param('id') id: string) {
    return this.performanceService.updateGoal(id, body);
  }

  @Delete('goals/:id')
  async deleteGoal(@Param('id') id: string) {
    return this.performanceService.deleteGoal(id);
  }

  @Get('reviews')
  async getReviews() {
    return this.performanceService.getReviews();
  }

  @Post('reviews')
  async createOrUpdateReview(@Body() dto: CreateReviewDto) {
    return this.performanceService.createOrUpdateReview(dto);
  }

  @Patch('reviews/:id')
  async updateReview(@Body() body: any, @Param('id') id: string) {
    return this.performanceService.updateReview(id, body);
  }

  @Delete('reviews/:id')
  async deleteReview(@Param('id') id: string) {
    return this.performanceService.deleteReview(id);
  }
}
