import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateInvoiceDto, CreateInvoiceItemDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ConvertFromPoDto } from './dto/convert-from-po.dto';
import { ConvertFromQuotationDto } from './dto/convert-from-quotation.dto';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to generate next sequential Invoice number: INV-YYYY-XXXX (Sales) or PINV-YYYY-XXXX (Purchase)
   */
  async generateNextNumber(type: string = 'SALES'): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === 'PURCHASE' ? `PINV-${year}-` : `INV-${year}-`;

    const latest = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    if (!latest) {
      return `${prefix}0001`;
    }

    const currentSeqStr = latest.invoiceNumber.replace(prefix, '');
    const currentSeq = parseInt(currentSeqStr, 10);
    const nextSeq = isNaN(currentSeq) ? 1 : currentSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Helper to compute financials for invoice and line items
   */
  private calculateTotals(
    dto: CreateInvoiceDto | UpdateInvoiceDto,
    items: CreateInvoiceItemDto[],
  ) {
    let computedSubTotal = 0;
    let computedCgst = 0;
    let computedSgst = 0;
    let computedIgst = 0;
    let computedTotalTax = 0;

    const taxType = dto.taxType || 'GST';

    const processedItems = (items || []).map((item, idx) => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.unitPrice) || 0;
      const discPct = Number(item.discountPercent) || 0;
      const taxPct = Number(item.taxPercent) || 0;

      const baseAmount = qty * rate;
      const discAmount = (baseAmount * discPct) / 100;
      const taxableAmount = Math.max(0, baseAmount - discAmount);

      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;
      let itemTax = 0;

      if (taxType === 'IGST') {
        itemIgst = (taxableAmount * taxPct) / 100;
        itemTax = itemIgst;
      } else if (taxType === 'GST') {
        itemCgst = (taxableAmount * (taxPct / 2)) / 100;
        itemSgst = (taxableAmount * (taxPct / 2)) / 100;
        itemTax = itemCgst + itemSgst;
      }

      const itemTotal = taxableAmount + itemTax;

      computedSubTotal += taxableAmount;
      computedCgst += itemCgst;
      computedSgst += itemSgst;
      computedIgst += itemIgst;
      computedTotalTax += itemTax;

      return {
        productId: item.productId || null,
        uomId: item.uomId || null,
        itemCode: item.itemCode || null,
        itemName: item.itemName,
        description: item.description || null,
        hsnCode: item.hsnCode || null,
        uom: item.uom || null,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        quantity: qty,
        unitPrice: rate,
        discountPercent: discPct,
        taxPercent: taxPct,
        cgstAmount: Math.round(itemCgst * 100) / 100,
        sgstAmount: Math.round(itemSgst * 100) / 100,
        igstAmount: Math.round(itemIgst * 100) / 100,
        totalPrice: Math.round(itemTotal * 100) / 100,
        sortOrder: item.sortOrder ?? idx,
      };
    });

    const discPercentage = Number(dto.discountPercentage) || 0;
    const globalDiscountAmount = (computedSubTotal * discPercentage) / 100;

    const shipping = Number(dto.shippingCharges) || 0;
    const other = Number(dto.otherCharges) || 0;

    const rawTotal =
      computedSubTotal -
      globalDiscountAmount +
      computedTotalTax +
      shipping +
      other;

    const roundedTotal = Math.round(rawTotal * 100) / 100;
    const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;

    const paid = Number(dto.paidAmount) || 0;
    const balance = Math.max(0, roundedTotal - paid);

    return {
      subTotal: Math.round(computedSubTotal * 100) / 100,
      discountPercentage: discPercentage,
      discountAmount: Math.round(globalDiscountAmount * 100) / 100,
      taxType,
      taxPercentage: Number(dto.taxPercentage) || 0,
      cgstAmount: Math.round(computedCgst * 100) / 100,
      sgstAmount: Math.round(computedSgst * 100) / 100,
      igstAmount: Math.round(computedIgst * 100) / 100,
      taxAmount: Math.round(computedTotalTax * 100) / 100,
      shippingCharges: shipping,
      otherCharges: other,
      roundOff,
      totalAmount: roundedTotal,
      paidAmount: paid,
      balanceAmount: balance,
      items: processedItems,
    };
  }

  private async resolveItemsUom(items: any[]): Promise<any[]> {
    if (!items || items.length === 0) return [];
    try {
      const allUoms = await this.prisma.uom.findMany();
      return items.map((it) => {
        let uomId = it.uomId || null;
        if (!uomId && it.uom) {
          const m = allUoms.find(
            (u) =>
              u.uomCode.toLowerCase() === it.uom.trim().toLowerCase() ||
              u.uomName.toLowerCase() === it.uom.trim().toLowerCase() ||
              u.id === it.uom,
          );
          if (m) uomId = m.id;
        }
        return { ...it, uomId };
      });
    } catch {
      return items;
    }
  }

  async create(dto: CreateInvoiceDto) {
    if (!dto.partyName || !dto.partyName.trim()) {
      throw new BadRequestException('Party name is required.');
    }
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one line item is required.');
    }

    const invoiceType = (dto.type as any) || 'SALES';
    const invoiceNumber = dto.invoiceNumber?.trim()
      ? dto.invoiceNumber.trim()
      : await this.generateNextNumber(invoiceType);

    // Ensure uniqueness
    const existing = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `Invoice number '${invoiceNumber}' already exists.`,
      );
    }

    const resolvedItems = await this.resolveItemsUom(dto.items || []);
    const { items, ...financials } = this.calculateTotals(dto, resolvedItems);

    let resolvedBankId: number | null = dto.bankId ? Number(dto.bankId) : null;
    if (!resolvedBankId && dto.bankName) {
      const bMatch = await this.prisma.bank.findFirst({
        where: {
          name: { equals: dto.bankName.trim(), mode: 'insensitive' },
        },
      });
      if (bMatch) resolvedBankId = bMatch.id;
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.invoice.create({
        data: {
          invoiceNumber,
          type: invoiceType,
          status: (dto.status as any) || 'DRAFT',
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          referenceNumber: dto.referenceNumber || null,
          documentUrl: dto.documentUrl || null,

          quotationId: dto.quotationId || null,
          purchaseOrderId: dto.purchaseOrderId || null,
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
          placeOfSupply: dto.placeOfSupply || 'Telangana (36)',
          deliveryMode: dto.deliveryMode || null,
          truckNumber: dto.truckNumber || null,
          transporterName: dto.transporterName || null,
          lrNumber: dto.lrNumber || null,
          driverName: dto.driverName || null,
          driverContact: dto.driverContact || null,

          currency: dto.currency || 'INR',
          ...financials,

          paymentTerms: dto.paymentTerms || null,
          paymentMethod: dto.paymentMethod || null,
          bankId: resolvedBankId,
          bankName: dto.bankName || null,
          bankAccountNumber: dto.bankAccountNumber || null,
          bankIfsc: dto.bankIfsc || null,
          termsAndConditions: dto.termsAndConditions || null,
          notes: dto.notes || null,

          preparedBy: dto.preparedBy || null,
          approvedBy: dto.approvedBy || null,

          items: {
            create: items,
          },
        },
        include: {
          items: {
            include: { product: true, uomRelation: true },
          },
          customer: true,
          supplier: true,
          vendor: true,
          purchaseOrder: true,
          quotation: true,
          bank: true,
        },
      });
    });
  }

  async findAll(params: {
    page?: string;
    limit?: string;
    search?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(params.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (params.type && params.type !== 'ALL') {
      where.type = params.type;
    }

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { partyName: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { partyGstNo: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.startDate || params.endDate) {
      where.invoiceDate = {};
      if (params.startDate) {
        where.invoiceDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = end;
      }
    }

    const [total, data, stats] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          customer: { select: { id: true, name: true, customerCode: true } },
          supplier: { select: { id: true, name: true, code: true } },
          vendor: { select: { id: true, name: true, code: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
        },
      }),
      this.prisma.invoice.aggregate({
        where: { isActive: true },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
        _count: { id: true },
      }),
    ]);

    // Aggregate counts by status
    const statusCounts = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { isActive: true },
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((sc) => {
      statusMap[sc.status] = sc._count.id;
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalInvoiced: stats._sum.totalAmount || 0,
        totalPaid: stats._sum.paidAmount || 0,
        totalBalance: stats._sum.balanceAmount || 0,
        totalCount: stats._count.id || 0,
        byStatus: statusMap,
      },
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { product: true, uomRelation: true },
        },
        customer: true,
        supplier: true,
        vendor: true,
        purchaseOrder: true,
        quotation: true,
        bank: true,
      },
    });

    if (!invoice || !invoice.isActive) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const existing = await this.findOne(id);

    const invoiceType = (dto.type || existing.type) as any;

    let itemsPayload: any = undefined;
    let financialsPayload: any = {};

    if (dto.items && dto.items.length > 0) {
      const resolvedItems = await this.resolveItemsUom(dto.items);
      const calc = this.calculateTotals(
        { ...existing, ...dto } as any,
        resolvedItems as any,
      );
      itemsPayload = calc.items;
      const { items: _, ...fin } = calc;
      financialsPayload = fin;
    }

    let resolvedBankId: number | null | undefined =
      dto.bankId !== undefined ? (dto.bankId ? Number(dto.bankId) : null) : undefined;
    if (resolvedBankId === undefined && dto.bankName) {
      const bMatch = await this.prisma.bank.findFirst({
        where: {
          name: { equals: dto.bankName.trim(), mode: 'insensitive' },
        },
      });
      if (bMatch) resolvedBankId = bMatch.id;
    }

    return this.prisma.$transaction(async (tx) => {
      if (itemsPayload) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          type: invoiceType,
          status: (dto.status || existing.status) as any,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
          dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
          referenceNumber: dto.referenceNumber !== undefined ? dto.referenceNumber : undefined,
          documentUrl: dto.documentUrl !== undefined ? dto.documentUrl : undefined,

          customerId: dto.customerId !== undefined ? dto.customerId : undefined,
          supplierId: dto.supplierId !== undefined ? dto.supplierId : undefined,
          vendorId: dto.vendorId !== undefined ? dto.vendorId : undefined,

          partyName: dto.partyName || undefined,
          partyEmail: dto.partyEmail !== undefined ? dto.partyEmail : undefined,
          partyPhone: dto.partyPhone !== undefined ? dto.partyPhone : undefined,
          partyAddress: dto.partyAddress !== undefined ? dto.partyAddress : undefined,
          partyGstNo: dto.partyGstNo !== undefined ? dto.partyGstNo : undefined,
          partyPanNo: dto.partyPanNo !== undefined ? dto.partyPanNo : undefined,

          billingAddress: dto.billingAddress !== undefined ? dto.billingAddress : undefined,
          shippingAddress: dto.shippingAddress !== undefined ? dto.shippingAddress : undefined,
          placeOfSupply: dto.placeOfSupply !== undefined ? dto.placeOfSupply : undefined,
          deliveryMode: dto.deliveryMode !== undefined ? dto.deliveryMode : undefined,
          truckNumber: dto.truckNumber !== undefined ? dto.truckNumber : undefined,
          transporterName: dto.transporterName !== undefined ? dto.transporterName : undefined,
          lrNumber: dto.lrNumber !== undefined ? dto.lrNumber : undefined,
          driverName: dto.driverName !== undefined ? dto.driverName : undefined,
          driverContact: dto.driverContact !== undefined ? dto.driverContact : undefined,

          currency: dto.currency || undefined,
          ...financialsPayload,

          paymentTerms: dto.paymentTerms !== undefined ? dto.paymentTerms : undefined,
          paymentMethod: dto.paymentMethod !== undefined ? dto.paymentMethod : undefined,
          bankId: resolvedBankId !== undefined ? resolvedBankId : undefined,
          bankName: dto.bankName !== undefined ? dto.bankName : undefined,
          bankAccountNumber: dto.bankAccountNumber !== undefined ? dto.bankAccountNumber : undefined,
          bankIfsc: dto.bankIfsc !== undefined ? dto.bankIfsc : undefined,
          termsAndConditions: dto.termsAndConditions !== undefined ? dto.termsAndConditions : undefined,
          notes: dto.notes !== undefined ? dto.notes : undefined,
          approvedBy: dto.approvedBy !== undefined ? dto.approvedBy : undefined,

          items: itemsPayload
            ? {
                create: itemsPayload,
              }
            : undefined,
        },
        include: {
          items: {
            include: { product: true, uomRelation: true },
          },
          customer: true,
          supplier: true,
          vendor: true,
          purchaseOrder: true,
          quotation: true,
          bank: true,
        },
      });
    });
  }

  async changeStatus(id: string, status: string) {
    const existing = await this.findOne(id);

    const updateData: any = { status: status as any };

    // If marked PAID, auto-clear balance
    if (status === 'PAID') {
      updateData.paidAmount = existing.totalAmount;
      updateData.balanceAmount = 0;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  /**
   * Convert a Purchase Order into an Invoice
   */
  async createFromPurchaseOrder(poId: string, dto: ConvertFromPoDto) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: { include: { product: true } },
        customer: true,
        supplier: true,
        vendor: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order '${poId}' not found`);
    }

    const isSales = po.type === 'SALES';
    const invoiceType = isSales ? 'SALES' : 'PURCHASE';

    const invoiceNumber = dto.invoiceNumber?.trim()
      ? dto.invoiceNumber.trim()
      : await this.generateNextNumber(invoiceType);

    const items: CreateInvoiceItemDto[] = (po.items || []).map((it) => ({
      productId: it.productId || undefined,
      itemCode: it.itemCode || undefined,
      itemName: it.itemName,
      description: it.description || undefined,
      hsnCode: it.hsnCode || undefined,
      uom: it.uom || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent,
      taxPercent: it.taxPercent,
    }));

    const createDto: CreateInvoiceDto = {
      invoiceNumber,
      type: invoiceType,
      status: 'ISSUED',
      invoiceDate: dto.invoiceDate || new Date().toISOString(),
      dueDate: dto.dueDate || po.expectedDeliveryDate?.toISOString(),
      referenceNumber: dto.referenceNumber || po.poNumber,
      purchaseOrderId: po.id,
      quotationId: po.quotationId || undefined,

      customerId: po.customerId || undefined,
      supplierId: po.supplierId || undefined,
      vendorId: po.vendorId || undefined,

      partyName: po.partyName,
      partyEmail: po.partyEmail || undefined,
      partyPhone: po.partyPhone || undefined,
      partyAddress: po.partyAddress || undefined,
      partyGstNo: po.partyGstNo || undefined,

      billingAddress: po.billingAddress || undefined,
      shippingAddress: po.shippingAddress || undefined,
      placeOfSupply: 'Telangana (36)',
      deliveryMode: dto.deliveryMode || undefined,
      truckNumber: dto.truckNumber || undefined,

      currency: po.currency || 'INR',
      discountPercentage: po.discountPercentage,
      taxType: (po.taxType as any) || 'GST',
      taxPercentage: po.taxPercentage,
      shippingCharges: po.shippingCharges,
      otherCharges: po.otherCharges,

      paymentTerms: po.paymentTerms || undefined,
      notes: dto.notes || `Generated from Purchase Order ${po.poNumber}`,
      termsAndConditions: po.termsAndConditions || undefined,

      items,
    };

    return this.create(createDto);
  }

  /**
   * Convert a Quotation into an Invoice
   */
  async createFromQuotation(quotationId: string, dto: ConvertFromQuotationDto) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation '${quotationId}' not found`);
    }

    const invoiceNumber = dto.invoiceNumber?.trim()
      ? dto.invoiceNumber.trim()
      : await this.generateNextNumber('SALES');

    const items: CreateInvoiceItemDto[] = (quotation.items || []).map((it) => ({
      productId: it.productId || undefined,
      itemCode: it.itemCode || undefined,
      itemName: it.itemName,
      description: it.description || undefined,
      hsnCode: it.hsnCode || undefined,
      uom: it.uom || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent,
      taxPercent: it.taxPercent,
    }));

    const createDto: CreateInvoiceDto = {
      invoiceNumber,
      type: 'SALES',
      status: 'ISSUED',
      invoiceDate: dto.invoiceDate || new Date().toISOString(),
      dueDate: dto.dueDate || quotation.validUntil?.toISOString(),
      referenceNumber: dto.referenceNumber || quotation.quotationNumber,
      quotationId: quotation.id,

      customerId: quotation.customerId || undefined,
      partyName: quotation.customerName,
      partyEmail: quotation.customerEmail || undefined,
      partyPhone: quotation.customerPhone || undefined,
      partyAddress: quotation.billingAddress || undefined,
      partyGstNo: quotation.gstNo || undefined,

      billingAddress: quotation.billingAddress || undefined,
      shippingAddress: quotation.shippingAddress || undefined,
      placeOfSupply: 'Telangana (36)',
      deliveryMode: dto.deliveryMode || undefined,
      truckNumber: dto.truckNumber || undefined,

      currency: quotation.currency || 'INR',
      discountPercentage: quotation.discountPercentage,
      taxType: (quotation.taxType as any) || 'GST',
      taxPercentage: quotation.taxPercentage,
      shippingCharges: quotation.shippingCharges,
      otherCharges: quotation.otherCharges,

      paymentTerms: quotation.paymentTerms || undefined,
      notes: dto.notes || `Generated from Quotation ${quotation.quotationNumber}`,
      termsAndConditions: quotation.termsAndConditions || undefined,

      items,
    };

    return this.create(createDto);
  }
}
