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
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('exit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class ExitController {
  constructor(private readonly exitService: ExitService) { }

  @Get('exits')
  async getExits(@Query() query: PaginationQueryDto & { status?: string; type?: string }) {
    return this.exitService.getExits(query);
  }

  @Post('exits/initiate')
  async initiateExit(@Body() dto: InitiateExitDto) {
    return this.exitService.initiateExit(dto);
  }

  @Patch('clearances/:id/status')
  async updateClearance(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('clearedBy') clearedBy?: string,
  ) {
    return this.exitService.updateClearance(id, status, clearedBy);
  }

  @Post('settlements')
  async processSettlement(@Body() dto: ProcessSettlementDto) {
    return this.exitService.processSettlement(dto);
  }

  @Get('settlements/:exitProcessId/calculate')
  async calculateSettlement(@Param('exitProcessId') exitProcessId: string) {
    return this.exitService.calculateSettlement(exitProcessId);
  }

  @Post('exits/:id/complete')
  async completeExit(@Param('id') id: string) {
    return this.exitService.completeExit(id);
  }

  @Patch('exits/:id')
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
  async deleteExit(@Param('id') id: string) {
    return this.exitService.deleteExit(id);
  }
}
