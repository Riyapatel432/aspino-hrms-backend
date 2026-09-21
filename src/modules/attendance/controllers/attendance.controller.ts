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
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('shifts')
  @RequirePermission('read', 'attendance')
  async getShifts(@Query() query: PaginationQueryDto) {
    return this.attendanceService.getShifts(query);
  }

  @Post('shifts')
  @RequirePermission('create', 'attendance')
  async createShift(@Body() dto: CreateShiftDto) {
    return this.attendanceService.createShift(dto);
  }

  @Patch('shifts/:id')
  @RequirePermission('update', 'attendance')
  async updateShift(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.updateShift(id, body);
  }

  @Delete('shifts/:id')
  @RequirePermission('delete', 'attendance')
  async deleteShift(@Param('id') id: string) {
    return this.attendanceService.deleteShift(id);
  }

  @Get('rosters')
  @RequirePermission('read', 'attendance')
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
  @RequirePermission('create', 'attendance')
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
  @RequirePermission('create', 'attendance')
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
  @RequirePermission('update', 'attendance')
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
  @RequirePermission('read', 'attendance')
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
  @RequirePermission('update', 'attendance')
  async updateRoster(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.updateRoster(id, body);
  }

  @Delete('rosters/:id')
  @RequirePermission('delete', 'attendance')
  async deleteRoster(@Param('id') id: string) {
    return this.attendanceService.deleteRoster(id);
  }

  @Get('attendance')
  @RequirePermission('read', 'attendance')
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
    @Req() req: any,
  ) {
    return this.attendanceService.getAttendance(query, req?.user);
  }

  @Post('attendance')
  @RequirePermission('create', 'attendance')
  async captureAttendance(@Body() dto: CaptureAttendanceDto) {
    return this.attendanceService.captureAttendance(dto);
  }

  @Post('attendance/bulk-import')
  @RequirePermission('create', 'attendance')
  async bulkImportAttendance(@Body() body: { records: any[] }) {
    const records = Array.isArray(body) ? body : body?.records || [];
    return this.attendanceService.bulkImportAttendance(records);
  }

  @Get('attendance/template')
  @RequirePermission('read', 'attendance')
  async getAttendanceTemplate(@Res() res: any) {
    const csvContent =
      'Employee Code / ID,Date (YYYY-MM-DD),Shift Name,In 1 (Check In),Out 1 (Lunch Out),In 2 (Lunch In),Out 2 (Day Out),In 3,Out 3,Break Minutes,On Duty Minutes,Total Work Hours,Status,Present Day Credit,OT Hours,Late Hours,Early Going Hours,Is Half Day,Is Sunday Present,Is Full Night Present,Is Holiday Present,Capture Method\n' +
      'aspino_2026_001,2026-09-11,General Shift,09:00,13:00,14:00,18:00,,,60,0,8.0,PRESENT,1.0,0.0,0.0,0.0,FALSE,FALSE,FALSE,FALSE,EXCEL_IMPORT\n' +
      'aspino_2026_002,2026-09-11,Morning Shift,06:00,10:00,10:30,14:30,,,30,0,8.0,PRESENT,1.0,1.5,0.0,0.0,FALSE,FALSE,FALSE,FALSE,EXCEL_IMPORT\n' +
      'aspino_2026_003,2026-09-11,General Shift,09:30,,,13:30,,,0,0,4.0,HALFDAY,0.5,0.0,0.5,0.0,TRUE,FALSE,FALSE,FALSE,EXCEL_IMPORT\n' +
      'aspino_2026_004,2026-09-11,Night Shift,22:00,,,06:00,,,0,0,8.0,PRESENT,1.0,0.0,0.0,0.0,FALSE,FALSE,TRUE,FALSE,EXCEL_IMPORT\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendance_import_template.csv"',
    );
    return res.send(csvContent);
  }

  @Patch('attendance/:id')
  @RequirePermission('update', 'attendance')
  async updateAttendance(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.updateAttendance(id, body);
  }

  @Delete('attendance/:id')
  @RequirePermission('delete', 'attendance')
  async deleteAttendance(@Param('id') id: string) {
    return this.attendanceService.deleteAttendance(id);
  }

  @Get('break-incidents')
  @RequirePermission('read', 'attendance')
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
  @RequirePermission('create', 'attendance')
  async createBreakIncident(@Body() dto: CreateBreakIncidentDto) {
    return this.attendanceService.createBreakIncident(dto);
  }

  @Delete('break-incidents/:id')
  @RequirePermission('delete', 'attendance')
  async deleteBreakIncident(@Param('id') id: string) {
    return this.attendanceService.deleteBreakIncident(id);
  }
}
