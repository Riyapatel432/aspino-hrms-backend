import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ConvertFromQuotationDto } from './dto/convert-from-quotation.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to generate next sequential PO number: PO-YYYY-XXXX or SPO-YYYY-XXXX
   */
  async generateNextNumber(type: string = 'PROCUREMENT'): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === 'SALES' ? `SPO-${year}-` : `PO-${year}-`;

    const latest = await this.prisma.purchaseOrder.findFirst({
      where: {
        poNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        poNumber: 'desc',
      },
    });

    if (!latest) {
      return `${prefix}0001`;
    }

    const currentSeqStr = latest.poNumber.replace(prefix, '');
    const currentSeq = parseInt(currentSeqStr, 10);
    const nextSeq = isNaN(currentSeq) ? 1 : currentSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Helper to compute financials for PO and line items
   */
  private calculateTotals(
    dto: CreatePurchaseOrderDto | UpdatePurchaseOrderDto,
    items: any[],
  ) {
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
        totalPrice:
          item.totalPrice !== undefined
            ? Number(item.totalPrice)
            : Number(itemTotal.toFixed(2)),
        sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : idx,
      };
    });

    const subTotal =
      dto.subTotal !== undefined
        ? Number(dto.subTotal)
        : Number(computedSubTotal.toFixed(2));
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

  async create(dto: CreatePurchaseOrderDto) {
    if (!dto.partyName || !dto.partyName.trim()) {
      throw new BadRequestException('Party Name (Supplier / Customer) is required.');
    }

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required to generate a PO.');
    }

    for (let i = 0; i < dto.items.length; i++) {
      const it = dto.items[i];
      if (!it.itemName || !it.itemName.trim()) {
        throw new BadRequestException(`Item #${i + 1}: Item name is required.`);
      }
      if (Number(it.quantity) <= 0) {
        throw new BadRequestException(`Item #${i + 1} (${it.itemName}): Quantity must be greater than 0.`);
      }
      if (Number(it.unitPrice) < 0) {
        throw new BadRequestException(`Item #${i + 1} (${it.itemName}): Unit price cannot be negative.`);
      }
    }

    const type = (dto.type?.toUpperCase() as any) || 'PROCUREMENT';

    let poNumber = dto.poNumber?.trim().toUpperCase();
    if (!poNumber) {
      poNumber = await this.generateNextNumber(type);
    } else {
      const existing = await this.prisma.purchaseOrder.findUnique({
        where: { poNumber },
      });
      if (existing) {
        throw new BadRequestException(`Purchase Order with number '${poNumber}' already exists.`);
      }
    }

    // Auto-populate party details if supplier / vendor / customer given and not explicitly filled
    let partyAddress = dto.partyAddress?.trim() || null;
    let partyGstNo = dto.partyGstNo?.trim().toUpperCase() || null;
    let partyEmail = dto.partyEmail?.trim() || null;
    let partyPhone = dto.partyPhone?.trim() || null;

    if (dto.supplierId && (!partyAddress || !partyGstNo)) {
      const supp = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (supp) {
        if (!partyAddress) partyAddress = supp.address || null;
        if (!partyGstNo) partyGstNo = supp.gstNo || null;
        if (!partyEmail) partyEmail = supp.email || null;
        if (!partyPhone) partyPhone = supp.phone || null;
      }
    } else if (dto.vendorId && (!partyAddress || !partyEmail)) {
      const vend = await this.prisma.vendor.findUnique({
        where: { id: dto.vendorId },
      });
      if (vend) {
        if (!partyAddress) partyAddress = vend.address || null;
        if (!partyEmail) partyEmail = vend.email || null;
        if (!partyPhone) partyPhone = vend.mobile || null;
      }
    } else if (dto.customerId && (!partyAddress || !partyGstNo)) {
      const cust = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (cust) {
        if (!partyAddress) partyAddress = cust.billingAddress || null;
        if (!partyGstNo) partyGstNo = cust.gstNo || null;
        if (!partyEmail) partyEmail = cust.email || null;
        if (!partyPhone) partyPhone = cust.phone || null;
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

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        type,
        status: (dto.status?.toUpperCase() as any) || 'DRAFT',
        poDate: dto.poDate ? new Date(dto.poDate) : new Date(),
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : null,
        referenceNumber: dto.referenceNumber?.trim() || null,
        documentUrl: dto.documentUrl?.trim() || null,
        quotationId: dto.quotationId || null,
        supplierId: dto.supplierId || null,
        vendorId: dto.vendorId || null,
        customerId: dto.customerId || null,
        partyName: dto.partyName.trim(),
        partyEmail,
        partyPhone,
        partyAddress,
        partyGstNo,
        billingAddress: dto.billingAddress?.trim() || null,
        shippingAddress: dto.shippingAddress?.trim() || null,
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
        supplier: true,
        vendor: true,
        customer: true,
        quotation: true,
      },
    });

    return {
      message: 'Purchase Order created successfully',
      purchaseOrder: po,
    };
  }

  async findAll(query: {
    page?: number | string;
    limit?: number | string;
    search?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const parsedPage = Math.max(1, parseInt(String(query.page || 1), 10));
      const parsedLimit = Math.max(
        1,
        Math.min(100, parseInt(String(query.limit || 10), 10)),
      );
      const skip = (parsedPage - 1) * parsedLimit;

      const where: any = {
        isActive: true,
      };

      if (query.type && query.type !== 'ALL') {
        where.type = query.type.toUpperCase();
      }

      if (query.status && query.status !== 'ALL') {
        where.status = query.status.toUpperCase();
      }

      if (query.search && query.search.trim()) {
        const s = query.search.trim();
        where.OR = [
          { poNumber: { contains: s, mode: 'insensitive' } },
          { partyName: { contains: s, mode: 'insensitive' } },
          { referenceNumber: { contains: s, mode: 'insensitive' } },
          { partyGstNo: { contains: s, mode: 'insensitive' } },
        ];
      }

      if (query.startDate || query.endDate) {
        where.poDate = {};
        if (query.startDate) {
          where.poDate.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          const end = new Date(query.endDate);
          end.setHours(23, 59, 59, 999);
          where.poDate.lte = end;
        }
      }

      const total = await this.prisma.purchaseOrder.count({ where });

      const data = await this.prisma.purchaseOrder.findMany({
        where,
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          supplier: true,
          vendor: true,
          customer: true,
          quotation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parsedLimit,
      });

      const totalPages = Math.ceil(total / parsedLimit) || 1;

      // Executive Metrics
      const allPOs = await this.prisma.purchaseOrder.findMany({
        where: { isActive: true },
        select: { type: true, status: true, totalAmount: true },
      });

      let totalPOValue = 0;
      let procurementCount = 0;
      let procurementValue = 0;
      let salesCount = 0;
      let salesValue = 0;
      let draftCount = 0;
      let issuedCount = 0;
      let confirmedCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;

      for (const p of allPOs) {
        const amt = p.totalAmount || 0;
        totalPOValue += amt;

        if (p.type === 'PROCUREMENT') {
          procurementCount++;
          procurementValue += amt;
        } else {
          salesCount++;
          salesValue += amt;
        }

        if (p.status === 'DRAFT') draftCount++;
        else if (p.status === 'ISSUED') issuedCount++;
        else if (p.status === 'CONFIRMED') confirmedCount++;
        else if (p.status === 'COMPLETED') completedCount++;
        else if (p.status === 'CANCELLED') cancelledCount++;
      }

      return {
        data,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages,
        },
        metrics: {
          totalPOs: allPOs.length,
          totalValue: Number(totalPOValue.toFixed(2)),
          procurementCount,
          procurementValue: Number(procurementValue.toFixed(2)),
          salesCount,
          salesValue: Number(salesValue.toFixed(2)),
          draftCount,
          issuedCount,
          confirmedCount,
          completedCount,
          cancelledCount,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to fetch purchase orders: ${error?.message || 'Database error'}`,
      );
    }
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: true,
            uomRelation: true,
          },
        },
        supplier: true,
        vendor: true,
        customer: true,
        quotation: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found.`);
    }

    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found.`);
    }

    if (dto.poNumber && dto.poNumber !== existing.poNumber) {
      const duplicate = await this.prisma.purchaseOrder.findUnique({
        where: { poNumber: dto.poNumber },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `Purchase Order with number '${dto.poNumber}' already exists.`,
        );
      }
    }

    const rawItems = dto.items !== undefined ? dto.items : existing.items;
    const resolvedItems = await this.resolveItemsUom(rawItems);
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
    } = this.calculateTotals(
      dto,
      resolvedItems,
    );

    const updateData: any = {
      partyName: dto.partyName !== undefined ? dto.partyName.trim() : existing.partyName,
      partyEmail: dto.partyEmail !== undefined ? dto.partyEmail?.trim() || null : existing.partyEmail,
      partyPhone: dto.partyPhone !== undefined ? dto.partyPhone?.trim() || null : existing.partyPhone,
      partyAddress: dto.partyAddress !== undefined ? dto.partyAddress?.trim() || null : existing.partyAddress,
      partyGstNo: dto.partyGstNo !== undefined ? dto.partyGstNo?.trim().toUpperCase() || null : existing.partyGstNo,
      billingAddress: dto.billingAddress !== undefined ? dto.billingAddress?.trim() || null : existing.billingAddress,
      shippingAddress: dto.shippingAddress !== undefined ? dto.shippingAddress?.trim() || null : existing.shippingAddress,
      paymentTerms: dto.paymentTerms !== undefined ? dto.paymentTerms?.trim() || null : existing.paymentTerms,
      deliveryTerms: dto.deliveryTerms !== undefined ? dto.deliveryTerms?.trim() || null : existing.deliveryTerms,
      termsAndConditions: dto.termsAndConditions !== undefined ? dto.termsAndConditions?.trim() || null : existing.termsAndConditions,
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
      preparedBy: dto.preparedBy !== undefined ? dto.preparedBy?.trim() || null : existing.preparedBy,
      approvedBy: dto.approvedBy !== undefined ? dto.approvedBy?.trim() || null : existing.approvedBy,
      currency: dto.currency ? dto.currency.trim().toUpperCase() : existing.currency,
      subTotal,
      discountPercentage,
      discountAmount,
      taxType: dto.taxType || existing.taxType,
      taxPercentage,
      taxAmount,
      shippingCharges,
      otherCharges,
      totalAmount,
    };

    if (dto.poNumber) updateData.poNumber = dto.poNumber.trim().toUpperCase();
    if (dto.type) updateData.type = dto.type.toUpperCase() as any;
    if (dto.status) updateData.status = dto.status.toUpperCase() as any;
    if (dto.poDate) updateData.poDate = new Date(dto.poDate);
    if (dto.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = dto.expectedDeliveryDate
        ? new Date(dto.expectedDeliveryDate)
        : null;
    }
    if (dto.referenceNumber !== undefined) updateData.referenceNumber = dto.referenceNumber?.trim() || null;
    if (dto.documentUrl !== undefined) updateData.documentUrl = dto.documentUrl?.trim() || null;
    if (dto.quotationId !== undefined) updateData.quotationId = dto.quotationId || null;
    if (dto.supplierId !== undefined) updateData.supplierId = dto.supplierId || null;
    if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId || null;
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.items !== undefined) {
      await this.prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });
      updateData.items = {
        create: processedItems,
      };
    }

    const updated = await this.prisma.purchaseOrder.update({
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
        supplier: true,
        vendor: true,
        customer: true,
        quotation: true,
      },
    });

    return {
      message: 'Purchase Order updated successfully',
      purchaseOrder: updated,
    };
  }

  async changeStatus(id: string, status: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found.`);
    }

    const validStatuses = [
      'DRAFT',
      'ISSUED',
      'CONFIRMED',
      'PARTIALLY_DELIVERED',
      'COMPLETED',
      'CANCELLED',
    ];
    const upperStatus = status.toUpperCase();

    if (!validStatuses.includes(upperStatus)) {
      throw new BadRequestException(
        `Invalid status '${status}'. Allowed values: ${validStatuses.join(', ')}`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: upperStatus as any },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        supplier: true,
        customer: true,
      },
    });

    return {
      message: `Purchase Order status changed to ${upperStatus}`,
      purchaseOrder: updated,
    };
  }

  async delete(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found.`);
    }

    await this.prisma.purchaseOrder.delete({
      where: { id },
    });

    return {
      message: `Purchase Order ${po.poNumber} deleted successfully.`,
    };
  }

  /**
   * 1-Click Convert an approved Quotation into an official Sales Purchase Order
   */
  async createFromQuotation(quotationId: string, dto: ConvertFromQuotationDto) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        customer: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${quotationId} not found.`);
    }

    const poNumber =
      dto.poNumber?.trim().toUpperCase() ||
      (await this.generateNextNumber('SALES'));

    // Check if PO Number exists
    const existing = await this.prisma.purchaseOrder.findUnique({
      where: { poNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `Purchase Order with number '${poNumber}' already exists.`,
      );
    }

    // Convert items
    const poItems = quotation.items.map((it, idx) => ({
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
      sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
    }));

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        type: 'SALES',
        status: 'CONFIRMED',
        poDate: dto.poDate ? new Date(dto.poDate) : new Date(),
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : null,
        referenceNumber: `Quotation: ${quotation.quotationNumber}`,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        partyName: quotation.customerName,
        partyEmail: quotation.customerEmail,
        partyPhone: quotation.customerPhone,
        partyAddress: quotation.billingAddress,
        partyGstNo: quotation.gstNo,
        billingAddress: quotation.billingAddress,
        shippingAddress: quotation.shippingAddress,
        currency: quotation.currency,
        subTotal: quotation.subTotal,
        discountPercentage: quotation.discountPercentage,
        discountAmount: quotation.discountAmount,
        taxType: quotation.taxType,
        taxPercentage: quotation.taxPercentage,
        taxAmount: quotation.taxAmount,
        shippingCharges: quotation.shippingCharges,
        otherCharges: quotation.otherCharges,
        totalAmount: quotation.totalAmount,
        paymentTerms: quotation.paymentTerms,
        deliveryTerms: quotation.deliveryTerms,
        termsAndConditions: quotation.termsAndConditions,
        notes: dto.notes || quotation.notes,
        preparedBy: dto.preparedBy || quotation.preparedBy,
        items: {
          create: poItems,
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { product: true },
        },
        customer: true,
        quotation: true,
      },
    });

    // Update Quotation status to CONVERTED and update customer PO tracking
    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: 'CONVERTED',
        customerPoNumber: dto.customerPoNumber?.trim() || poNumber,
        customerPoDate: dto.customerPoDate
          ? new Date(dto.customerPoDate)
          : new Date(),
        customerPoNotes: dto.notes?.trim() || `Generated PO ${poNumber}`,
      },
    });

    return {
      message: `Quotation ${quotation.quotationNumber} successfully converted to Purchase Order ${poNumber}`,
      purchaseOrder: po,
    };
  }
}
