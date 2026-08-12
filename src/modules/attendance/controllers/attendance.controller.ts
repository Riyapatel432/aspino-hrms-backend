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
  Res,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AttendanceService } from '../services/attendance.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { CreateRosterDto } from '../dto/create-roster.dto';
import { CaptureAttendanceDto } from '../dto/capture-attendance.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Get('shifts')
  async getShifts(@Query() query: PaginationQueryDto) {
    return this.attendanceService.getShifts(query);
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
  async getRosters(@Query() query: PaginationQueryDto & { employeeId?: string; shiftId?: string }) {
    return this.attendanceService.getRosters(query);
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
  async getAttendance(@Query() query: PaginationQueryDto & { employeeId?: string; status?: string; date?: string; month?: string; year?: string }) {
    return this.attendanceService.getAttendance(query);
  }

  @Post('attendance')
  async captureAttendance(@Body() dto: CaptureAttendanceDto) {
    return this.attendanceService.captureAttendance(dto);
  }

  @Post('attendance/bulk-import')
  async bulkImportAttendance(@Body() body: { records: any[] }) {
    const records = Array.isArray(body) ? body : (body?.records || []);
    return this.attendanceService.bulkImportAttendance(records);
  }

  @Get('attendance/template')
  async getAttendanceTemplate(@Res() res: any) {
    const csvContent = [
      'Employee Code / ID,Date (YYYY-MM-DD),Check In (HH:mm),Check Out (HH:mm),Status (PRESENT/ABSENT/HALFDAY/LATE),OT Hours,Late Hours,Early Going Hours,Present Day',
      'ASP-2026-0001,2026-08-01,09:00,17:30,PRESENT,0,0,0,1.0',
      'ASP-2026-0002,2026-08-01,09:15,17:30,LATE,0,0.25,0,1.0',
      'ASP-2026-0003,2026-08-01,09:00,13:00,HALFDAY,0,0,0,0.5',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_import_template.csv"');
    return res.send(csvContent);
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
