import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LeaveService } from '../services/leave.service';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { ApplyLeaveDto } from '../dto/apply-leave.dto';
import { CreateLeaveMasterDto } from '../dto/create-leave-master.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('leave')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('holidays')
  @RequirePermission('read', 'leave')
  async getHolidays(@Query() query: PaginationQueryDto) {
    return this.leaveService.getHolidays(query);
  }

  @Post('holidays')
  @RequirePermission('create', 'leave')
  async createHoliday(@Body() dto: CreateHolidayDto) {
    return this.leaveService.createHoliday(dto);
  }

  @Patch('holidays/:id')
  @RequirePermission('update', 'leave')
  async updateHoliday(@Param('id') id: string, @Body() body: any) {
    return this.leaveService.updateHoliday(id, body);
  }

  @Delete('holidays/:id')
  @RequirePermission('delete', 'leave')
  async deleteHoliday(@Param('id') id: string) {
    return this.leaveService.deleteHoliday(id);
  }

  @Get('leaves')
  @RequirePermission('read', 'leave')
  async getLeaveApplications(
    @Query()
    query: PaginationQueryDto & { employeeId?: string; status?: string },
    @Req() req: any,
  ) {
    return this.leaveService.getLeaveApplications(query, req?.user);
  }

  @Post('leaves/apply')
  @RequirePermission('create', 'leave')
  async applyLeave(@Body() dto: ApplyLeaveDto) {
    return this.leaveService.applyLeave(dto);
  }

  @Patch('leaves/:id')
  @RequirePermission('update', 'leave')
  async updateLeaveApplication(@Param('id') id: string, @Body() body: any) {
    return this.leaveService.updateLeaveApplication(id, body);
  }

  @Delete('leaves/:id')
  @RequirePermission('delete', 'leave')
  async deleteLeaveApplication(@Param('id') id: string) {
    return this.leaveService.deleteLeaveApplication(id);
  }

  @Patch('leaves/:id/status')
  @RequirePermission('approve', 'leave')
  async updateLeaveStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.leaveService.updateLeaveStatus(id, status);
  }

  // --- Department Leave Master ---
  @Get('leave-master')
  @RequirePermission('read', 'leave')
  async getLeaveMasters(
    @Query()
    query: PaginationQueryDto & { department?: string; fiscalYear?: string },
  ) {
    return this.leaveService.getLeaveMasters(query);
  }

  @Post('leave-master')
  @RequirePermission('create', 'leave')
  async createLeaveMaster(@Body() dto: CreateLeaveMasterDto) {
    return this.leaveService.createLeaveMaster(dto);
  }

  @Patch('leave-master/:id')
  @RequirePermission('update', 'leave')
  async updateLeaveMaster(@Param('id') id: string, @Body() body: any) {
    return this.leaveService.updateLeaveMaster(id, body);
  }

  @Delete('leave-master/:id')
  @RequirePermission('delete', 'leave')
  async deleteLeaveMaster(@Param('id') id: string) {
    return this.leaveService.deleteLeaveMaster(id);
  }
}
