import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { GatePassService } from './gate-pass.service';
import { CreateGatePassDto } from './dto/create-gate-pass.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('gate-pass')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GatePassController {
  constructor(private readonly service: GatePassService) {}

  @Post()
  @RequirePermission('create', 'gatepass')
  async create(@Body() dto: CreateGatePassDto) {
    return this.service.createGatePass(dto);
  }

  @Get()
  @RequirePermission('read', 'gatepass')
  async findAll(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.service.getAllGatePasses(type, search, parsedPage, parsedLimit);
  }

  @Get(':id/pdf')
  @RequirePermission('export', 'gatepass')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.service.generateGatePassPdfBuffer(id);
    const pass = await this.service.getGatePassById(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="GatePass_${pass.passNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.end(pdfBuffer);
  }

  @Get(':id')
  @RequirePermission('read', 'gatepass')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getGatePassById(id);
  }

  @Patch(':id/timeout')
  @RequirePermission('update', 'gatepass')
  async recordTimeOut(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.recordTimeOut(id);
  }

  @Patch(':id/link-grn-po')
  @RequirePermission('update', 'gatepass')
  async linkGrnPo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('poNumber') poNumber?: string,
    @Body('grnNumber') grnNumber?: string,
  ) {
    return this.service.linkGrnPo(id, poNumber, grnNumber);
  }
}
