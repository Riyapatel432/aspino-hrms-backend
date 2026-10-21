import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { QuotationService } from './quotation.service';
import { QuotationPdfService } from './quotation-pdf.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ChangeQuotationStatusDto } from './dto/change-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('quotation')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QuotationController {
  constructor(
    private readonly quotationService: QuotationService,
    private readonly quotationPdfService: QuotationPdfService,
  ) {}

  @Get('generate-number')
  @RequirePermission('read', 'quotation')
  generateNumber() {
    return this.quotationService.generateNextNumber().then((number) => ({
      quotationNumber: number,
    }));
  }

  @Post()
  @RequirePermission('create', 'quotation')
  create(@Body() createQuotationDto: CreateQuotationDto) {
    return this.quotationService.create(createQuotationDto);
  }

  @Get()
  @RequirePermission('read', 'quotation')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.quotationService.findAll(
      search,
      status,
      customerId,
      startDate,
      endDate,
      parsedPage,
      parsedLimit,
    );
  }

  @Get(':id')
  @RequirePermission('read', 'quotation')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationService.findOne(id);
  }

  @Get(':id/pdf')
  @RequirePermission('read', 'quotation')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const quotation = await this.quotationService.findOne(id);
    const pdfBuffer =
      await this.quotationPdfService.generateQuotationPdfBuffer(quotation);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Quotation_${quotation.quotationNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.end(pdfBuffer);
  }

  @Patch(':id')
  @RequirePermission('update', 'quotation')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
  ) {
    return this.quotationService.update(id, updateQuotationDto);
  }

  @Patch(':id/status')
  @RequirePermission('update', 'quotation')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangeQuotationStatusDto,
  ) {
    return this.quotationService.changeStatus(id, changeStatusDto.status);
  }

  @Post(':id/duplicate')
  @RequirePermission('create', 'quotation')
  duplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationService.duplicate(id);
  }

  @Delete(':id')
  @RequirePermission('delete', 'quotation')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationService.remove(id);
  }
}
