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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ChangeInvoiceStatusDto } from './dto/change-status.dto';
import { ConvertFromPoDto } from './dto/convert-from-po.dto';
import { ConvertFromQuotationDto } from './dto/convert-from-quotation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('invoice')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  @Post('upload')
  @RequirePermission('create', 'invoice')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/invoices';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.pdf';
          cb(null, `inv-doc-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'application/pdf' ||
          file.mimetype.startsWith('image/') ||
          file.originalname.toLowerCase().endsWith('.pdf')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PDF or image documents are allowed for invoice attachments.',
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadDocument(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Please select a valid document to upload.');
    }
    return {
      url: `/uploads/invoices/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Post()
  @RequirePermission('create', 'invoice')
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  @RequirePermission('read', 'invoice')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.invoiceService.findAll({
      page,
      limit,
      search,
      type,
      status,
      startDate,
      endDate,
    });
  }

  @Get('next-number')
  @RequirePermission('create', 'invoice')
  async getNextNumber(@Query('type') type?: string) {
    const nextNumber = await this.invoiceService.generateNextNumber(type || 'SALES');
    return { nextNumber };
  }

  @Get(':id')
  @RequirePermission('read', 'invoice')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.findOne(id);
  }

  @Get(':id/pdf')
  @RequirePermission('read', 'invoice')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoiceService.findOne(id);
    const pdfBuffer = await this.invoicePdfService.generateInvoicePdfBuffer(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.end(pdfBuffer);
  }

  @Patch(':id')
  @RequirePermission('update', 'invoice')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(id, updateInvoiceDto);
  }

  @Patch(':id/status')
  @RequirePermission('update', 'invoice')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangeInvoiceStatusDto,
  ) {
    return this.invoiceService.changeStatus(id, changeStatusDto.status);
  }

  @Delete(':id')
  @RequirePermission('delete', 'invoice')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.delete(id);
  }

  @Post('from-po/:poId')
  @RequirePermission('create', 'invoice')
  createFromPo(
    @Param('poId', ParseUUIDPipe) poId: string,
    @Body() dto: ConvertFromPoDto,
  ) {
    return this.invoiceService.createFromPurchaseOrder(poId, dto);
  }

  @Post('from-quotation/:quotationId')
  @RequirePermission('create', 'invoice')
  createFromQuotation(
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
    @Body() dto: ConvertFromQuotationDto,
  ) {
    return this.invoiceService.createFromQuotation(quotationId, dto);
  }
}
