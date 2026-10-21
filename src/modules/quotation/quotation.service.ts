import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

@Injectable()
export class QuotationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to generate next sequential quotation number: QTN-YYYY-XXXX
   */
  async generateNextNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QTN-${year}-`;

    const latest = await this.prisma.quotation.findFirst({
      where: {
        quotationNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        quotationNumber: 'desc',
      },
    });

    if (!latest) {
      return `${prefix}0001`;
    }

    const currentSeqStr = latest.quotationNumber.replace(prefix, '');
    const currentSeq = parseInt(currentSeqStr, 10);
    const nextSeq = isNaN(currentSeq) ? 1 : currentSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Helper to recalculate financial sums for quotation & its line items
   */
  private calculateTotals(dto: CreateQuotationDto | UpdateQuotationDto, items: any[]) {
    let computedSubTotal = 0;

    const processedItems = (items || []).map((item, idx) => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.unitPrice) || 0;
      const discPct = Number(item.discountPercent) || 0;
      const taxPct = Number(item.taxPercent) || 0;

      const baseAmount = qty * rate;
      const discAmount = (baseAmount * discPct) / 100;
      const taxableAmount = Math.max(0, baseAmount - discAmount);
      const itemTaxAmount = (taxableAmount * taxPct) / 100;
      const itemTotal = taxableAmount + itemTaxAmount;

      computedSubTotal += taxableAmount;

      return {
        productId: item.productId || null,
        uomId: item.uomId || null,
        itemCode: item.itemCode?.trim() || null,
        itemName: item.itemName?.trim() || 'Item',
        description: item.description?.trim() || null,
        hsnCode: item.hsnCode?.trim() || null,
        uom: item.uom?.trim() || null,
        quantity: qty,
        unitPrice: rate,
        discountPercent: discPct,
        taxPercent: taxPct,
        totalPrice: item.totalPrice !== undefined ? Number(item.totalPrice) : Number(itemTotal.toFixed(2)),
        sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : idx,
      };
    });

    const subTotal = dto.subTotal !== undefined ? Number(dto.subTotal) : Number(computedSubTotal.toFixed(2));
    const discPct = Number(dto.discountPercentage) || 0;
    const discAmount =
      dto.discountAmount !== undefined
        ? Number(dto.discountAmount)
        : Number(((subTotal * discPct) / 100).toFixed(2));

    const discountedSubTotal = Math.max(0, subTotal - discAmount);

    const taxPct = Number(dto.taxPercentage) || 0;
    const taxAmount =
      dto.taxAmount !== undefined
        ? Number(dto.taxAmount)
        : Number(((discountedSubTotal * taxPct) / 100).toFixed(2));

    const shipping = Number(dto.shippingCharges) || 0;
    const other = Number(dto.otherCharges) || 0;

    const grandTotal =
      dto.totalAmount !== undefined
        ? Number(dto.totalAmount)
        : Number((discountedSubTotal + taxAmount + shipping + other).toFixed(2));

    return {
      processedItems,
      subTotal,
      discountPercentage: discPct,
      discountAmount: discAmount,
      taxPercentage: taxPct,
      taxAmount,
      shippingCharges: shipping,
      otherCharges: other,
      totalAmount: grandTotal,
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

  async create(dto: CreateQuotationDto) {
    if (!dto.customerName || !dto.customerName.trim()) {
      throw new BadRequestException('Customer Name is required.');
    }

    if (dto.quotationDate && dto.validUntil) {
      const qDate = new Date(dto.quotationDate);
      const vDate = new Date(dto.validUntil);
      if (vDate < qDate) {
        throw new BadRequestException(
          'Validity date (Valid Until) cannot be earlier than Quotation Date.',
        );
      }
    }

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException(
        'At least one line item is required to generate a quotation.',
      );
    }

    for (let i = 0; i < dto.items.length; i++) {
      const it = dto.items[i];
      if (!it.itemName || !it.itemName.trim()) {
        throw new BadRequestException(`Item #${i + 1}: Item name is required.`);
      }
      if (Number(it.quantity) <= 0) {
        throw new BadRequestException(
          `Item #${i + 1} (${it.itemName}): Quantity must be greater than 0.`,
        );
      }
      if (Number(it.unitPrice) < 0) {
        throw new BadRequestException(
          `Item #${i + 1} (${it.itemName}): Unit price cannot be negative.`,
        );
      }
    }

    let qNumber = dto.quotationNumber?.trim().toUpperCase();
    if (!qNumber) {
      qNumber = await this.generateNextNumber();
    } else {
      const existing = await this.prisma.quotation.findUnique({
        where: { quotationNumber: qNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `Quotation with number '${qNumber}' already exists.`,
        );
      }
    }

    const resolvedItems = await this.resolveItemsUom(dto.items || []);
    const {
      processedItems,
      subTotal,
      discountPercentage,
      discountAmount,
      taxPercentage,
      taxAmount,
      shippingCharges,
      otherCharges,
      totalAmount,
    } = this.calculateTotals(dto, resolvedItems);

    const quotation = await this.prisma.quotation.create({
      data: {
        quotationNumber: qNumber,
        customerId: dto.customerId || null,
        customerName: dto.customerName.trim(),
        customerEmail: dto.customerEmail?.trim() || null,
        customerPhone: dto.customerPhone?.trim() || null,
        billingAddress: dto.billingAddress?.trim() || null,
        shippingAddress: dto.shippingAddress?.trim() || null,
        gstNo: dto.gstNo?.trim().toUpperCase() || null,
        quotationDate: dto.quotationDate ? new Date(dto.quotationDate) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        referenceNumber: dto.referenceNumber?.trim() || null,
        customerPoNumber: dto.customerPoNumber?.trim() || null,
        customerPoDate: dto.customerPoDate ? new Date(dto.customerPoDate) : null,
        customerPoNotes: dto.customerPoNotes?.trim() || null,
        status: (dto.status?.toUpperCase() as any) || 'DRAFT',
        currency: dto.currency?.trim().toUpperCase() || 'INR',
        subTotal,
        discountPercentage,
        discountAmount,
        taxType: dto.taxType || 'GST',
        taxPercentage,
        taxAmount,
        shippingCharges,
        otherCharges,
        totalAmount,
        paymentTerms: dto.paymentTerms?.trim() || null,
        deliveryTerms: dto.deliveryTerms?.trim() || null,
        termsAndConditions: dto.termsAndConditions?.trim() || null,
        notes: dto.notes?.trim() || null,
        preparedBy: dto.preparedBy?.trim() || null,
        approvedBy: dto.approvedBy?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: true,
            uomRelation: true,
          },
        },
        customer: true,
      },
    });

    return {
      message: 'Quotation created successfully',
      quotation,
    };
  }

  async findAll(
    search?: string,
    status?: string,
    customerId?: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { quotationNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { gstNo: { contains: q, mode: 'insensitive' } },
        {
          items: {
            some: {
              OR: [
                { itemName: { contains: q, mode: 'insensitive' } },
                { itemCode: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (customerId && customerId !== 'ALL') {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.quotationDate = {};
      if (startDate) where.quotationDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.quotationDate.lte = end;
      }
    }

    try {
      if (!page && !limit) {
        return await this.prisma.quotation.findMany({
          where,
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
            },
            customer: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      const total = await this.prisma.quotation.count({ where });
      const parsedLimit = limit ? Number(limit) : 10;
      const parsedPage = page ? Number(page) : 1;
      const skip = (parsedPage - 1) * parsedLimit;

      const data = await this.prisma.quotation.findMany({
        where,
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parsedLimit,
      });

      const totalPages = Math.ceil(total / parsedLimit) || 1;

      // Aggregates & Dashboard Metrics
      const allQuotations = await this.prisma.quotation.findMany({
        select: { status: true, totalAmount: true },
      });

      const totalQuotationsCount = allQuotations.length;
      let totalQuotationsValue = 0;
      let draftCount = 0;
      let draftValue = 0;
      let sentCount = 0;
      let sentValue = 0;
      let acceptedCount = 0;
      let acceptedValue = 0;
      let rejectedCount = 0;
      let rejectedValue = 0;
      let convertedCount = 0;
      let convertedValue = 0;

      for (const q of allQuotations) {
        const amt = q.totalAmount || 0;
        totalQuotationsValue += amt;
        if (q.status === 'DRAFT') {
          draftCount++;
          draftValue += amt;
        } else if (q.status === 'SENT') {
          sentCount++;
          sentValue += amt;
        } else if (q.status === 'ACCEPTED') {
          acceptedCount++;
          acceptedValue += amt;
        } else if (q.status === 'REJECTED') {
          rejectedCount++;
          rejectedValue += amt;
        } else if (q.status === 'CONVERTED') {
          convertedCount++;
          convertedValue += amt;
        }
      }

      const conversionRate =
        totalQuotationsCount > 0
          ? Number((((acceptedCount + convertedCount) / totalQuotationsCount) * 100).toFixed(1))
          : 0;

      return {
        data,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        metrics: {
          totalQuotations: totalQuotationsCount,
          totalValue: Number(totalQuotationsValue.toFixed(2)),
          draftCount,
          draftValue: Number(draftValue.toFixed(2)),
          sentCount,
          sentValue: Number(sentValue.toFixed(2)),
          acceptedCount,
          acceptedValue: Number(acceptedValue.toFixed(2)),
          rejectedCount,
          rejectedValue: Number(rejectedValue.toFixed(2)),
          convertedCount,
          convertedValue: Number(convertedValue.toFixed(2)),
          conversionRate,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to fetch quotations: ${error?.message || 'Database error'}`,
      );
    }
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
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
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found.`);
    }

    return quotation;
  }

  async update(id: string, dto: UpdateQuotationDto) {
    const existing = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(`Quotation with ID ${id} not found.`);
    }

    if (dto.quotationNumber && dto.quotationNumber !== existing.quotationNumber) {
      const duplicate = await this.prisma.quotation.findUnique({
        where: { quotationNumber: dto.quotationNumber },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `Quotation with number '${dto.quotationNumber}' already exists.`,
        );
      }
    }

    if (dto.customerName !== undefined && !dto.customerName.trim()) {
      throw new BadRequestException('Customer Name cannot be empty.');
    }

    const effectiveQDate = dto.quotationDate ? new Date(dto.quotationDate) : existing.quotationDate;
    const effectiveVDate = dto.validUntil !== undefined ? (dto.validUntil ? new Date(dto.validUntil) : null) : existing.validUntil;
    if (effectiveQDate && effectiveVDate && effectiveVDate < effectiveQDate) {
      throw new BadRequestException(
        'Validity date (Valid Until) cannot be earlier than Quotation Date.',
      );
    }

    if (dto.items !== undefined) {
      if (!Array.isArray(dto.items) || dto.items.length === 0) {
        throw new BadRequestException(
          'At least one line item is required for the quotation.',
        );
      }
      for (let i = 0; i < dto.items.length; i++) {
        const it = dto.items[i];
        if (!it.itemName || !it.itemName.trim()) {
          throw new BadRequestException(`Item #${i + 1}: Item name is required.`);
        }
        if (Number(it.quantity) <= 0) {
          throw new BadRequestException(
            `Item #${i + 1} (${it.itemName}): Quantity must be greater than 0.`,
          );
        }
        if (Number(it.unitPrice) < 0) {
          throw new BadRequestException(
            `Item #${i + 1} (${it.itemName}): Unit price cannot be negative.`,
          );
        }
      }
    }

    const rawItemsToProcess = dto.items !== undefined ? dto.items : existing.items;
    const itemsToProcess = await this.resolveItemsUom(rawItemsToProcess);
    const {
      processedItems,
      subTotal,
      discountPercentage,
      discountAmount,
      taxPercentage,
      taxAmount,
      shippingCharges,
      otherCharges,
      totalAmount,
    } = this.calculateTotals(dto, itemsToProcess);

    const updateData: any = {
      customerName: dto.customerName?.trim() ?? existing.customerName,
      billingAddress: dto.billingAddress !== undefined ? dto.billingAddress?.trim() || null : existing.billingAddress,
      shippingAddress: dto.shippingAddress !== undefined ? dto.shippingAddress?.trim() || null : existing.shippingAddress,
      gstNo: dto.gstNo !== undefined ? dto.gstNo?.trim().toUpperCase() || null : existing.gstNo,
      customerEmail: dto.customerEmail !== undefined ? dto.customerEmail?.trim() || null : existing.customerEmail,
      customerPhone: dto.customerPhone !== undefined ? dto.customerPhone?.trim() || null : existing.customerPhone,
      referenceNumber: dto.referenceNumber !== undefined ? dto.referenceNumber?.trim() || null : existing.referenceNumber,
      currency: dto.currency !== undefined ? dto.currency?.trim().toUpperCase() || 'INR' : existing.currency,
      paymentTerms: dto.paymentTerms !== undefined ? dto.paymentTerms?.trim() || null : existing.paymentTerms,
      deliveryTerms: dto.deliveryTerms !== undefined ? dto.deliveryTerms?.trim() || null : existing.deliveryTerms,
      termsAndConditions: dto.termsAndConditions !== undefined ? dto.termsAndConditions?.trim() || null : existing.termsAndConditions,
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
      preparedBy: dto.preparedBy !== undefined ? dto.preparedBy?.trim() || null : existing.preparedBy,
      approvedBy: dto.approvedBy !== undefined ? dto.approvedBy?.trim() || null : existing.approvedBy,
      subTotal,
      discountPercentage,
      discountAmount,
      taxType: dto.taxType ?? existing.taxType,
      taxPercentage,
      taxAmount,
      shippingCharges,
      otherCharges,
      totalAmount,
    };

    if (dto.quotationNumber) updateData.quotationNumber = dto.quotationNumber.trim().toUpperCase();
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId || null;
    if (dto.referenceNumber !== undefined) updateData.referenceNumber = dto.referenceNumber?.trim() || null;
    if (dto.customerPoNumber !== undefined) updateData.customerPoNumber = dto.customerPoNumber?.trim() || null;
    if (dto.customerPoDate !== undefined) updateData.customerPoDate = dto.customerPoDate ? new Date(dto.customerPoDate) : null;
    if (dto.customerPoNotes !== undefined) updateData.customerPoNotes = dto.customerPoNotes?.trim() || null;
    if (dto.status) updateData.status = dto.status.toUpperCase() as any;
    if (dto.quotationDate) updateData.quotationDate = new Date(dto.quotationDate);
    if (dto.validUntil !== undefined) updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Handle items replacement if provided
    if (dto.items !== undefined) {
      await this.prisma.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      updateData.items = {
        create: processedItems,
      };
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: true,
            uomRelation: true,
          },
        },
        customer: true,
      },
    });

    return {
      message: 'Quotation updated successfully',
      quotation: updated,
    };
  }

  async changeStatus(id: string, status: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found.`);
    }

    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'];
    const upperStatus = status.toUpperCase();

    if (!validStatuses.includes(upperStatus)) {
      throw new BadRequestException(
        `Invalid status '${status}'. Allowed values: ${validStatuses.join(', ')}`,
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status: upperStatus as any },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        customer: true,
      },
    });

    return {
      message: `Quotation status changed to ${upperStatus}`,
      quotation: updated,
    };
  }

  async duplicate(id: string) {
    const source = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!source) {
      throw new NotFoundException(`Source quotation with ID ${id} not found.`);
    }

    const nextNumber = await this.generateNextNumber();

    const duplicated = await this.prisma.quotation.create({
      data: {
        quotationNumber: nextNumber,
        customerId: source.customerId,
        customerName: source.customerName,
        customerEmail: source.customerEmail,
        customerPhone: source.customerPhone,
        billingAddress: source.billingAddress,
        shippingAddress: source.shippingAddress,
        gstNo: source.gstNo,
        quotationDate: new Date(),
        validUntil: source.validUntil,
        referenceNumber: source.referenceNumber ? `${source.referenceNumber} (Copy)` : null,
        status: 'DRAFT',
        currency: source.currency,
        subTotal: source.subTotal,
        discountPercentage: source.discountPercentage,
        discountAmount: source.discountAmount,
        taxType: source.taxType,
        taxPercentage: source.taxPercentage,
        taxAmount: source.taxAmount,
        shippingCharges: source.shippingCharges,
        otherCharges: source.otherCharges,
        totalAmount: source.totalAmount,
        paymentTerms: source.paymentTerms,
        deliveryTerms: source.deliveryTerms,
        termsAndConditions: source.termsAndConditions,
        notes: source.notes,
        preparedBy: source.preparedBy,
        items: {
          create: source.items.map((it, idx) => ({
            productId: it.productId,
            itemCode: it.itemCode,
            itemName: it.itemName,
            description: it.description,
            hsnCode: it.hsnCode,
            uom: it.uom,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPercent: it.discountPercent,
            taxPercent: it.taxPercent,
            totalPrice: it.totalPrice,
            sortOrder: idx,
          })),
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        customer: true,
      },
    });

    return {
      message: 'Quotation duplicated successfully as draft',
      quotation: duplicated,
    };
  }

  async remove(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found.`);
    }

    await this.prisma.quotation.delete({
      where: { id },
    });

    return {
      message: 'Quotation deleted successfully',
    };
  }
}
