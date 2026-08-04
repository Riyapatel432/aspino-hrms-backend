import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LeaveService } from '../services/leave.service';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { ApplyLeaveDto } from '../dto/apply-leave.dto';
import { CreateLeaveMasterDto } from '../dto/create-leave-master.dto';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';

@Controller('staff-hrms/leave')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('holidays')
  async getHolidays() {
    return this.leaveService.getHolidays();
  }

  @Post('holidays')
  async createHoliday(@Body() dto: CreateHolidayDto) {
    return this.leaveService.createHoliday(dto);
  }

  @Patch('holidays/:id')
  async updateHoliday(@Param('id') id: string, @Body() body: any) {
    return this.leaveService.updateHoliday(id, body);
  }

  @Delete('holidays/:id')
  async deleteHoliday(@Param('id') id: string) {
    return this.leaveService.deleteHoliday(id);
  }

  @Get('leaves')
  async getLeaveApplications() {
    return this.leaveService.getLeaveApplications();
  }

  @Post('leaves/apply')
  async applyLeave(@Body() dto: ApplyLeaveDto) {
    return this.leaveService.applyLeave(dto);
  }

  @Patch('leaves/:id')
  async updateLeaveApplication(@Param('id') id: string, @Body() body: any) {
    return this.leaveService.updateLeaveApplication(id, body);
  }

  @Delete('leaves/:id')
  async deleteLeaveApplication(@Param('id') id: string) {
    return this.leaveService.deleteLeaveApplication(id);
  }

  @Patch('leaves/:id/status')
  async updateLeaveStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.leaveService.updateLeaveStatus(id, status);
  }

  // --- Department Leave Master ---
  @Get('leave-master')
  async getLeaveMasters() {
    return this.leaveService.getLeaveMasters();
  }

  @Post('leave-master')
  async createLeaveMaster(@Body() dto: CreateLeaveMasterDto) {
    return this.leaveService.createLeaveMaster(dto);
  }

  @Delete('leave-master/:id')
  async deleteLeaveMaster(@Param('id') id: string) {
    return this.leaveService.deleteLeaveMaster(id);
  }
}
