import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DeliveryChallanService } from './delivery-challan.service';
import { DeliveryChallanPdfService } from './delivery-challan-pdf.service';
import { CreateDeliveryChallanDto } from './dto/create-delivery-challan.dto';
import { UpdateDeliveryChallanDto } from './dto/update-delivery-challan.dto';
import { ChangeChallanStatusDto } from './dto/change-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';
import { ChallanStatus } from '@prisma/client';

@Controller('delivery-challan')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DeliveryChallanController {
  constructor(
    private readonly challanService: DeliveryChallanService,
    private readonly pdfService: DeliveryChallanPdfService,
  ) {}

  @Post()
  @RequirePermission('create', 'delivery_challan')
  create(@Body() dto: CreateDeliveryChallanDto) {
    return this.challanService.create(dto);
  }

  @Get()
  @RequirePermission('read', 'delivery_challan')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('challanType') challanType?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.challanService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      challanType,
      search,
      startDate,
      endDate,
    });
  }

  @Get('statistics')
  @RequirePermission('read', 'delivery_challan')
  getStatistics() {
    return this.challanService.getStatistics();
  }

  @Get('next-number')
  @RequirePermission('create', 'delivery_challan')
  async getNextNumber() {
    const nextNumber = await this.challanService.generateNextChallanNumber();
    return { nextNumber };
  }

  @Get(':id')
  @RequirePermission('read', 'delivery_challan')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.challanService.findOne(id);
  }

  @Get(':id/pdf')
  @RequirePermission('read', 'delivery_challan')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const challan = await this.challanService.findOne(id);
    const pdfBuffer = await this.pdfService.generatePdfBuffer(challan);

    const safeNumber = (challan.challanNumber || 'Delivery_Challan').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Patch(':id')
  @RequirePermission('update', 'delivery_challan')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryChallanDto,
  ) {
    return this.challanService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('update', 'delivery_challan')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeChallanStatusDto,
  ) {
    return this.challanService.changeStatus(id, dto.status as ChallanStatus);
  }

  @Delete(':id')
  @RequirePermission('delete', 'delivery_challan')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.challanService.remove(id);
  }
}
