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
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ChangePurchaseOrderStatusDto } from './dto/change-status.dto';
import { ConvertFromQuotationDto } from './dto/convert-from-quotation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('purchase-order')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchaseOrderController {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly purchaseOrderPdfService: PurchaseOrderPdfService,
  ) {}

  @Post('upload')
  @RequirePermission('create', 'purchase_order')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/purchase-orders';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.pdf';
          cb(null, `po-doc-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'application/pdf' ||
          file.originalname.toLowerCase().endsWith('.pdf')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF documents are allowed.'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadDocument(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Please select a valid PDF document to upload.');
    }
    return {
      url: `/uploads/purchase-orders/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Post()
  @RequirePermission('create', 'purchase_order')
  create(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto) {
    return this.purchaseOrderService.create(createPurchaseOrderDto);
  }

  @Get()
  @RequirePermission('read', 'purchase_order')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.purchaseOrderService.findAll({
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
  @RequirePermission('create', 'purchase_order')
  async getNextNumber(@Query('type') type?: string) {
    const nextNumber = await this.purchaseOrderService.generateNextNumber(type || 'PROCUREMENT');
    return { nextNumber };
  }

  @Get(':id')
  @RequirePermission('read', 'purchase_order')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOrderService.findOne(id);
  }

  @Get(':id/pdf')
  @RequirePermission('read', 'purchase_order')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const po = await this.purchaseOrderService.findOne(id);
    const pdfBuffer = await this.purchaseOrderPdfService.generatePurchaseOrderPdfBuffer(po);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PurchaseOrder_${po.poNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.end(pdfBuffer);
  }

  @Patch(':id')
  @RequirePermission('update', 'purchase_order')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.update(id, updatePurchaseOrderDto);
  }

  @Patch(':id/status')
  @RequirePermission('update', 'purchase_order')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangePurchaseOrderStatusDto,
  ) {
    return this.purchaseOrderService.changeStatus(id, changeStatusDto.status);
  }

  @Delete(':id')
  @RequirePermission('delete', 'purchase_order')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOrderService.delete(id);
  }

  @Post('from-quotation/:quotationId')
  @RequirePermission('create', 'purchase_order')
  createFromQuotation(
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
    @Body() dto: ConvertFromQuotationDto,
  ) {
    return this.purchaseOrderService.createFromQuotation(quotationId, dto);
  }
}
