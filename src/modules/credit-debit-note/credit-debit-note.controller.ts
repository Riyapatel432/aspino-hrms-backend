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
import { CreditDebitNoteService } from './credit-debit-note.service';
import { CreditDebitNotePdfService } from './credit-debit-note-pdf.service';
import {
  CreateCreditDebitNoteDto,
  NoteTypeDto,
} from './dto/create-credit-debit-note.dto';
import { UpdateCreditDebitNoteDto } from './dto/update-credit-debit-note.dto';
import { ChangeNoteStatusDto } from './dto/change-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('credit-debit-note')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CreditDebitNoteController {
  constructor(
    private readonly noteService: CreditDebitNoteService,
    private readonly notePdfService: CreditDebitNotePdfService,
  ) {}

  @Post('upload')
  @RequirePermission('create', 'credit_debit_note')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/credit-debit-notes';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.pdf';
          cb(null, `note-doc-${uniqueSuffix}${ext}`);
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
              'Only PDF or image documents are allowed for note attachments.',
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
      url: `/uploads/credit-debit-notes/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Post()
  @RequirePermission('create', 'credit_debit_note')
  create(@Body() dto: CreateCreditDebitNoteDto) {
    return this.noteService.create(dto);
  }

  @Get()
  @RequirePermission('read', 'credit_debit_note')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.noteService.findAll({
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
  @RequirePermission('create', 'credit_debit_note')
  async getNextNumber(@Query('type') type?: string) {
    const nextNumber = await this.noteService.generateNextNumber(type || NoteTypeDto.CREDIT_NOTE);
    return { nextNumber };
  }

  @Get(':id')
  @RequirePermission('read', 'credit_debit_note')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.noteService.findOne(id);
  }

  @Get(':id/pdf')
  @RequirePermission('read', 'credit_debit_note')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const note = await this.noteService.findOne(id);
    const pdfBuffer = await this.notePdfService.generateNotePdfBuffer(note);

    const prefix = note.type === 'CREDIT_NOTE' ? 'CreditNote' : 'DebitNote';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${prefix}_${note.noteNumber}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.end(pdfBuffer);
  }

  @Patch(':id')
  @RequirePermission('update', 'credit_debit_note')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditDebitNoteDto,
  ) {
    return this.noteService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('update', 'credit_debit_note')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangeNoteStatusDto,
  ) {
    return this.noteService.changeStatus(id, changeStatusDto.status);
  }

  @Delete(':id')
  @RequirePermission('delete', 'credit_debit_note')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.noteService.delete(id);
  }

  @Post('from-invoice/:invoiceId')
  @RequirePermission('create', 'credit_debit_note')
  createFromInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body() body: { type: string; reason: string; items?: any[] },
  ) {
    return this.noteService.createFromInvoice(invoiceId, body);
  }
}
