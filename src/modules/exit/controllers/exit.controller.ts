import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ExitService } from '../services/exit.service';
import { InitiateExitDto } from '../dto/initiate-exit.dto';
import { ProcessSettlementDto } from '../dto/process-settlement.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('exit')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExitController {
  constructor(private readonly exitService: ExitService) {}

  @Get('exits')
  @RequirePermission('read', 'exit')
  async getExits(
    @Query() query: PaginationQueryDto & { status?: string; type?: string },
  ) {
    return this.exitService.getExits(query);
  }

  @Post('exits/initiate')
  @RequirePermission('create', 'exit')
  async initiateExit(@Body() dto: InitiateExitDto) {
    return this.exitService.initiateExit(dto);
  }

  @Patch('clearances/:id/status')
  @RequirePermission('update', 'exit')
  async updateClearance(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('clearedBy') clearedBy?: string,
  ) {
    return this.exitService.updateClearance(id, status, clearedBy);
  }

  @Post('settlements')
  @RequirePermission('create', 'exit')
  async processSettlement(@Body() dto: ProcessSettlementDto) {
    return this.exitService.processSettlement(dto);
  }

  @Get('settlements/:exitProcessId/calculate')
  @RequirePermission('read', 'exit')
  async calculateSettlement(@Param('exitProcessId') exitProcessId: string) {
    return this.exitService.calculateSettlement(exitProcessId);
  }

  @Post('exits/:id/complete')
  @RequirePermission('update', 'exit')
  async completeExit(@Param('id') id: string) {
    return this.exitService.completeExit(id);
  }

  @Patch('exits/:id')
  @RequirePermission('update', 'exit')
  async updateExit(
    @Param('id') id: string,
    @Body()
    body: {
      type?: string;
      resignationDate?: string;
      noticePeriodDays?: number;
      lastWorkingDay?: string;
      reason?: string;
    },
  ) {
    return this.exitService.updateExit(id, body);
  }

  @Delete('exits/:id')
  @RequirePermission('delete', 'exit')
  async deleteExit(@Param('id') id: string) {
    return this.exitService.deleteExit(id);
  }
}
