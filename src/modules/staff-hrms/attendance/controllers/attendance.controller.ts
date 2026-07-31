import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { CreateRosterDto } from '../dto/create-roster.dto';
import { CaptureAttendanceDto } from '../dto/capture-attendance.dto';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';

@Controller('staff-hrms/attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('shifts')
  async getShifts() {
    return this.attendanceService.getShifts();
  }

  @Post('shifts')
  async createShift(@Body() dto: CreateShiftDto) {
    return this.attendanceService.createShift(dto);
  }

  @Patch('shifts/:id')
  async updateShift(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.updateShift(id, body);
  }

  @Delete('shifts/:id')
  async deleteShift(@Param('id') id: string) {
    return this.attendanceService.deleteShift(id);
  }

  @Get('rosters')
  async getRosters() {
    return this.attendanceService.getRosters();
  }

  @Post('rosters')
  async createRoster(@Body() dto: CreateRosterDto) {
    return this.attendanceService.createRoster(dto);
  }

  @Patch('rosters/:id')
  async updateRoster(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.updateRoster(id, body);
  }

  @Delete('rosters/:id')
  async deleteRoster(@Param('id') id: string) {
    return this.attendanceService.deleteRoster(id);
  }

  @Get('attendance')
  async getAttendance() {
    return this.attendanceService.getAttendance();
  }

  @Post('attendance')
  async captureAttendance(@Body() dto: CaptureAttendanceDto) {
    return this.attendanceService.captureAttendance(dto);
  }

  @Patch('attendance/:id')
  async updateAttendance(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.updateAttendance(id, body);
  }

  @Delete('attendance/:id')
  async deleteAttendance(@Param('id') id: string) {
    return this.attendanceService.deleteAttendance(id);
  }
}
