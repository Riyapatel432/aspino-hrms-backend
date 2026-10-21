import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CreateCreditDebitNoteDto,
  NoteTypeDto,
  NoteStatusDto,
} from './dto/create-credit-debit-note.dto';
import { UpdateCreditDebitNoteDto } from './dto/update-credit-debit-note.dto';

@Injectable()
export class CreditDebitNoteService {
  private readonly logger = new Logger(CreditDebitNoteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateNextNumber(type: NoteTypeDto | string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === NoteTypeDto.DEBIT_NOTE || type === 'DEBIT_NOTE' ? `DN-${year}-` : `CN-${year}-`;

    const lastNote = await this.prisma.creditDebitNote.findFirst({
      where: {
        noteNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        noteNumber: 'desc',
      },
      select: {
        noteNumber: true,
      },
    });

    let nextSeq = 1;
    if (lastNote?.noteNumber) {
      const parts = lastNote.noteNumber.split('-');
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          nextSeq = parsed + 1;
        }
      }
    }

    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  private calculateFinancials(dto: any) {
    const items = dto.items || [];
    let subTotal = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let taxAmount = 0;

    const processedItems = items.map((it: any, index: number) => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.unitPrice) || 0;
      const disc = Number(it.discountPercent) || 0;
      const tax = Number(it.taxPercent) || 0;

      const baseAmount = qty * rate;
      const discAmount = (baseAmount * disc) / 100;
      const taxableAmount = Math.max(0, baseAmount - discAmount);

      let itCgst = 0;
      let itSgst = 0;
      let itIgst = 0;

      if (dto.taxType === 'IGST') {
        itIgst = (taxableAmount * tax) / 100;
      } else if (dto.taxType !== 'NONE') {
        itCgst = (taxableAmount * (tax / 2)) / 100;
        itSgst = (taxableAmount * (tax / 2)) / 100;
      }

      const itTax = itIgst + itCgst + itSgst;
      const totalPrice = Number((taxableAmount + itTax).toFixed(2));

      subTotal += taxableAmount;
      cgstAmount += itCgst;
      sgstAmount += itSgst;
      igstAmount += itIgst;
      taxAmount += itTax;

      return {
        ...it,
        quantity: qty,
        unitPrice: rate,
        discountPercent: disc,
        taxPercent: tax,
        cgstAmount: Number(itCgst.toFixed(2)),
        sgstAmount: Number(itSgst.toFixed(2)),
        igstAmount: Number(itIgst.toFixed(2)),
        totalPrice,
        sortOrder: it.sortOrder !== undefined ? it.sortOrder : index,
      };
    });

    const otherCharges = Number(dto.otherCharges) || 0;
    const rawTotal = subTotal + taxAmount + otherCharges;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Number((roundedTotal - rawTotal).toFixed(2));
    const totalAmount = Number((dto.totalAmount !== undefined ? dto.totalAmount : roundedTotal));
    const adjustedAmount = Number(dto.adjustedAmount) || 0;
    const balanceAmount = Number((totalAmount - adjustedAmount).toFixed(2));

    return {
      processedItems,
      subTotal: Number(subTotal.toFixed(2)),
      cgstAmount: Number(cgstAmount.toFixed(2)),
      sgstAmount: Number(sgstAmount.toFixed(2)),
      igstAmount: Number(igstAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      otherCharges,
      roundOff,
      totalAmount,
      adjustedAmount,
      balanceAmount,
    };
  }

  async create(dto: CreateCreditDebitNoteDto) {
    if (!dto.partyName || !dto.partyName.trim()) {
      throw new BadRequestException('Party name is required.');
    }
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Reason for Credit/Debit Note is required.');
    }

    const noteNumber = dto.noteNumber?.trim() || (await this.generateNextNumber(dto.type));

    const existing = await this.prisma.creditDebitNote.findUnique({
      where: { noteNumber },
    });
    if (existing) {
      throw new BadRequestException(`Note number ${noteNumber} already exists`);
    }

    const {
      processedItems,
      subTotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxAmount,
      otherCharges,
      roundOff,
      totalAmount,
      adjustedAmount,
      balanceAmount,
    } = this.calculateFinancials(dto);

    return this.prisma.creditDebitNote.create({
      data: {
        noteNumber,
        type: dto.type as any,
        status: (dto.status as any) || 'DRAFT',
        noteDate: dto.noteDate ? new Date(dto.noteDate) : new Date(),
        reason: dto.reason,

        invoiceId: dto.invoiceId || null,
        invoiceNumber: dto.invoiceNumber || null,
        originalInvoiceDate: dto.originalInvoiceDate ? new Date(dto.originalInvoiceDate) : null,

        customerId: dto.customerId || null,
        supplierId: dto.supplierId || null,
        vendorId: dto.vendorId || null,

        partyName: dto.partyName,
        partyEmail: dto.partyEmail || null,
        partyPhone: dto.partyPhone || null,
        partyAddress: dto.partyAddress || null,
        partyGstNo: dto.partyGstNo || null,
        partyPanNo: dto.partyPanNo || null,

        billingAddress: dto.billingAddress || null,
        shippingAddress: dto.shippingAddress || null,
        placeOfSupply: dto.placeOfSupply || null,

        currency: dto.currency || 'INR',
        subTotal,
        taxType: dto.taxType || 'GST',
        taxPercentage: dto.taxPercentage || 0,
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount,
        otherCharges,
        roundOff,
        totalAmount,
        adjustedAmount,
        balanceAmount,

        termsAndConditions: dto.termsAndConditions || null,
        notes: dto.notes || null,
        documentUrl: dto.documentUrl || null,
        preparedBy: dto.preparedBy || null,
        approvedBy: dto.approvedBy || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,

        items: {
          create: processedItems.map((item) => ({
            productId: item.productId || null,
            uomId: item.uomId || null,
            itemCode: item.itemCode || null,
            itemName: item.itemName,
            description: item.description || null,
            hsnCode: item.hsnCode || null,
            uom: item.uom || null,
            batchNumber: item.batchNumber || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            taxPercent: item.taxPercent || 0,
            cgstAmount: item.cgstAmount || 0,
            sgstAmount: item.sgstAmount || 0,
            igstAmount: item.igstAmount || 0,
            totalPrice: item.totalPrice,
            sortOrder: item.sortOrder || 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            uomRelation: true,
          },
        },
        customer: true,
        vendor: true,
        supplier: true,
        invoice: true,
      },
    });
  }

  async findAll(query: {
    page?: string;
    limit?: string;
    search?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (query.type && (query.type === 'CREDIT_NOTE' || query.type === 'DEBIT_NOTE')) {
      where.type = query.type;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { noteNumber: { contains: q, mode: 'insensitive' } },
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { partyName: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.noteDate = {};
      if (query.startDate) {
        where.noteDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const eDate = new Date(query.endDate);
        eDate.setHours(23, 59, 59, 999);
        where.noteDate.lte = eDate;
      }
    }

    const [data, total, creditAgg, debitAgg, draftCount] = await Promise.all([
      this.prisma.creditDebitNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { noteDate: 'desc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              product: true,
              uomRelation: true,
            },
          },
          customer: { select: { id: true, name: true, phone: true } },
          vendor: { select: { id: true, name: true, mobile: true } },
          supplier: { select: { id: true, name: true, phone: true } },
          invoice: { select: { id: true, invoiceNumber: true, invoiceDate: true, totalAmount: true } },
        },
      }),
      this.prisma.creditDebitNote.count({ where }),
      this.prisma.creditDebitNote.aggregate({
        where: { isActive: true, type: 'CREDIT_NOTE' },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.creditDebitNote.aggregate({
        where: { isActive: true, type: 'DEBIT_NOTE' },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.creditDebitNote.count({
        where: { isActive: true, status: 'DRAFT' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      kpi: {
        totalCreditNotes: creditAgg._count.id || 0,
        totalCreditAmount: creditAgg._sum.totalAmount || 0,
        totalDebitNotes: debitAgg._count.id || 0,
        totalDebitAmount: debitAgg._sum.totalAmount || 0,
        pendingDrafts: draftCount,
      },
    };
  }

  async findOne(id: string) {
    const note = await this.prisma.creditDebitNote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: true,
            uomRelation: true,
          },
        },
        customer: true,
        vendor: true,
        supplier: true,
        invoice: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException(`Credit/Debit Note with ID ${id} not found`);
    }

    return note;
  }

  async update(id: string, dto: UpdateCreditDebitNoteDto) {
    const existing = await this.findOne(id);

    const {
      processedItems,
      subTotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxAmount,
      otherCharges,
      roundOff,
      totalAmount,
      adjustedAmount,
      balanceAmount,
    } = this.calculateFinancials({ ...existing, ...dto });

    return this.prisma.$transaction(async (tx) => {
      if (dto.items && Array.isArray(dto.items)) {
        await tx.creditDebitNoteItem.deleteMany({
          where: { noteId: id },
        });

        await tx.creditDebitNoteItem.createMany({
          data: processedItems.map((item) => ({
            noteId: id,
            productId: item.productId || null,
            uomId: item.uomId || null,
            itemCode: item.itemCode || null,
            itemName: item.itemName,
            description: item.description || null,
            hsnCode: item.hsnCode || null,
            uom: item.uom || null,
            batchNumber: item.batchNumber || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            taxPercent: item.taxPercent || 0,
            cgstAmount: item.cgstAmount || 0,
            sgstAmount: item.sgstAmount || 0,
            igstAmount: item.igstAmount || 0,
            totalPrice: item.totalPrice,
            sortOrder: item.sortOrder || 0,
          })),
        });
      }

      return tx.creditDebitNote.update({
        where: { id },
        data: {
          noteNumber: dto.noteNumber !== undefined ? dto.noteNumber : existing.noteNumber,
          type: dto.type !== undefined ? (dto.type as any) : existing.type,
          status: dto.status !== undefined ? (dto.status as any) : existing.status,
          noteDate: dto.noteDate ? new Date(dto.noteDate) : existing.noteDate,
          reason: dto.reason !== undefined ? dto.reason : existing.reason,

          invoiceId: dto.invoiceId !== undefined ? dto.invoiceId : existing.invoiceId,
          invoiceNumber: dto.invoiceNumber !== undefined ? dto.invoiceNumber : existing.invoiceNumber,
          originalInvoiceDate: dto.originalInvoiceDate
            ? new Date(dto.originalInvoiceDate)
            : existing.originalInvoiceDate,

          customerId: dto.customerId !== undefined ? dto.customerId : existing.customerId,
          supplierId: dto.supplierId !== undefined ? dto.supplierId : existing.supplierId,
          vendorId: dto.vendorId !== undefined ? dto.vendorId : existing.vendorId,

          partyName: dto.partyName !== undefined ? dto.partyName : existing.partyName,
          partyEmail: dto.partyEmail !== undefined ? dto.partyEmail : existing.partyEmail,
          partyPhone: dto.partyPhone !== undefined ? dto.partyPhone : existing.partyPhone,
          partyAddress: dto.partyAddress !== undefined ? dto.partyAddress : existing.partyAddress,
          partyGstNo: dto.partyGstNo !== undefined ? dto.partyGstNo : existing.partyGstNo,
          partyPanNo: dto.partyPanNo !== undefined ? dto.partyPanNo : existing.partyPanNo,

          billingAddress: dto.billingAddress !== undefined ? dto.billingAddress : existing.billingAddress,
          shippingAddress: dto.shippingAddress !== undefined ? dto.shippingAddress : existing.shippingAddress,
          placeOfSupply: dto.placeOfSupply !== undefined ? dto.placeOfSupply : existing.placeOfSupply,

          currency: dto.currency !== undefined ? dto.currency : existing.currency,
          subTotal,
          taxType: dto.taxType !== undefined ? dto.taxType : existing.taxType,
          taxPercentage: dto.taxPercentage !== undefined ? dto.taxPercentage : existing.taxPercentage,
          cgstAmount,
          sgstAmount,
          igstAmount,
          taxAmount,
          otherCharges,
          roundOff,
          totalAmount,
          adjustedAmount,
          balanceAmount,

          termsAndConditions:
            dto.termsAndConditions !== undefined
              ? dto.termsAndConditions
              : existing.termsAndConditions,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          documentUrl: dto.documentUrl !== undefined ? dto.documentUrl : existing.documentUrl,
          preparedBy: dto.preparedBy !== undefined ? dto.preparedBy : existing.preparedBy,
          approvedBy: dto.approvedBy !== undefined ? dto.approvedBy : existing.approvedBy,
          isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        },
        include: {
          items: true,
          customer: true,
          vendor: true,
          supplier: true,
          invoice: true,
        },
      });
    });
  }

  async changeStatus(id: string, status: NoteStatusDto | string) {
    await this.findOne(id);
    return this.prisma.creditDebitNote.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.creditDebitNote.delete({
      where: { id },
    });
  }

  async createFromInvoice(invoiceId: string, body: { type: NoteTypeDto | string; reason: string; items?: any[] }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        customer: true,
        vendor: true,
        supplier: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    const noteType = body.type === 'DEBIT_NOTE' ? NoteTypeDto.DEBIT_NOTE : NoteTypeDto.CREDIT_NOTE;
    const noteNumber = await this.generateNextNumber(noteType);

    const itemsToUse = body.items && body.items.length > 0 ? body.items : invoice.items;

    const itemsPayload = itemsToUse.map((it: any) => ({
      productId: it.productId,
      uomId: it.uomId,
      itemCode: it.itemCode,
      itemName: it.itemName,
      description: it.description,
      hsnCode: it.hsnCode,
      uom: it.uom,
      batchNumber: it.batchNumber,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discountPercent: Number(it.discountPercent) || 0,
      taxPercent: Number(it.taxPercent) || 0,
    }));

    return this.create({
      noteNumber,
      type: noteType,
      status: NoteStatusDto.DRAFT,
      noteDate: new Date().toISOString(),
      reason: body.reason || (noteType === NoteTypeDto.CREDIT_NOTE ? 'Sales Return / Rate Difference' : 'Purchase Return / Rate Correction'),
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      originalInvoiceDate: invoice.invoiceDate ? invoice.invoiceDate.toISOString() : undefined,
      customerId: invoice.customerId || undefined,
      vendorId: invoice.vendorId || undefined,
      supplierId: invoice.supplierId || undefined,
      partyName: invoice.partyName,
      partyEmail: invoice.partyEmail || undefined,
      partyPhone: invoice.partyPhone || undefined,
      partyAddress: invoice.partyAddress || undefined,
      partyGstNo: invoice.partyGstNo || undefined,
      partyPanNo: invoice.partyPanNo || undefined,
      billingAddress: invoice.billingAddress || invoice.partyAddress || undefined,
      shippingAddress: invoice.shippingAddress || invoice.billingAddress || invoice.partyAddress || undefined,
      placeOfSupply: invoice.placeOfSupply || undefined,
      currency: invoice.currency || 'INR',
      taxType: invoice.taxType || 'GST',
      items: itemsPayload,
    });
  }
}
