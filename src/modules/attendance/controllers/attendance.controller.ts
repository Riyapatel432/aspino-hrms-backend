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
  Req,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AttendanceService } from '../services/attendance.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { CreateRosterDto } from '../dto/create-roster.dto';
import { BulkCreateRosterDto } from '../dto/bulk-roster.dto';
import { ChangeShiftDto } from '../dto/change-shift.dto';
import { CaptureAttendanceDto } from '../dto/capture-attendance.dto';
import { CreateBreakIncidentDto } from '../dto/create-break-incident.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr', 'hod', 'admin')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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
  async getRosters(
    @Query()
    query: PaginationQueryDto & {
      employeeId?: string;
      shiftId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
      month?: string;
      year?: string;
    },
  ) {
    return this.attendanceService.getRosters(query);
  }

  @Post('rosters')
  async createRoster(@Body() dto: CreateRosterDto, @Req() req: any) {
    if (!dto.changedByName && req.user?.name) {
      dto.changedByName = req.user.name;
    }
    if (!dto.changedByRole && req.user?.role) {
      dto.changedByRole = req.user.role.toUpperCase();
    }
    return this.attendanceService.createRoster(dto);
  }

  @Post('rosters/bulk')
  async bulkCreateRosters(@Body() dto: BulkCreateRosterDto, @Req() req: any) {
    if (!dto.changedByName && req.user?.name) {
      dto.changedByName = req.user.name;
    }
    if (!dto.changedByRole && req.user?.role) {
      dto.changedByRole = req.user.role.toUpperCase();
    }
    return this.attendanceService.bulkCreateRosters(dto);
  }

  @Post('rosters/:id/change-shift')
  async changeShift(
    @Param('id') id: string,
    @Body() dto: ChangeShiftDto,
    @Req() req: any,
  ) {
    if (!dto.changedById && req.user?.userId) {
      dto.changedById = req.user.userId;
    }
    if (!dto.changedByName && req.user?.name) {
      dto.changedByName = req.user.name;
    }
    if (!dto.changedByRole && req.user?.role) {
      dto.changedByRole = req.user.role.toUpperCase();
    }
    return this.attendanceService.changeShift(id, dto);
  }

  @Get('rosters/audit-history')
  async getShiftAuditLogs(
    @Query()
    query: PaginationQueryDto & {
      employeeId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.attendanceService.getShiftAuditLogs(query);
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
  async getAttendance(
    @Query()
    query: PaginationQueryDto & {
      employeeId?: string;
      status?: string;
      date?: string;
      month?: string;
      year?: string;
      departmentId?: string;
    },
  ) {
    return this.attendanceService.getAttendance(query);
  }

  @Post('attendance')
  async captureAttendance(@Body() dto: CaptureAttendanceDto) {
    return this.attendanceService.captureAttendance(dto);
  }

  @Post('attendance/bulk-import')
  async bulkImportAttendance(@Body() body: { records: any[] }) {
    const records = Array.isArray(body) ? body : body?.records || [];
    return this.attendanceService.bulkImportAttendance(records);
  }

  @Get('attendance/template')
  async getAttendanceTemplate(@Res() res: any) {
    const csvContent =
      'Employee Code / ID,Date (YYYY-MM-DD),Shift Name,In 1 (Check In),Out 1 (Lunch Out),In 2 (Lunch In),Out 2 (Day Out),In 3,Out 3,Status,OT Hours\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendance_import_template.csv"',
    );
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

  // --- Break Misuse Incident Endpoints (Subjective HOD Complaints) ---
  @Get('break-incidents')
  async getBreakIncidents(
    @Query()
    query: PaginationQueryDto & {
      employeeId?: string;
      departmentId?: string;
      date?: string;
    },
  ) {
    return this.attendanceService.getBreakIncidents(query);
  }

  @Post('break-incidents')
  async createBreakIncident(@Body() dto: CreateBreakIncidentDto) {
    return this.attendanceService.createBreakIncident(dto);
  }

  @Delete('break-incidents/:id')
  async deleteBreakIncident(@Param('id') id: string) {
    return this.attendanceService.deleteBreakIncident(id);
  }
}
