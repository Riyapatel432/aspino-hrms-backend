import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateDeliveryChallanDto } from './dto/create-delivery-challan.dto';
import { UpdateDeliveryChallanDto } from './dto/update-delivery-challan.dto';
import { ChallanStatus, ChallanType } from '@prisma/client';

@Injectable()
export class DeliveryChallanService {
  private readonly logger = new Logger(DeliveryChallanService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate sequential Delivery Challan number: DC-YYYY-XXXX
   */
  async generateNextChallanNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DC-${year}-`;

    const lastChallan = await this.prisma.deliveryChallan.findFirst({
      where: {
        challanNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        challanNumber: 'desc',
      },
      select: {
        challanNumber: true,
      },
    });

    if (!lastChallan || !lastChallan.challanNumber) {
      return `${prefix}0001`;
    }

    const parts = lastChallan.challanNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    const nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Create a new Delivery Challan
   */
  async create(dto: CreateDeliveryChallanDto) {
    let challanNumber = dto.challanNumber?.trim();
    if (!challanNumber) {
      challanNumber = await this.generateNextChallanNumber();
    } else {
      const existing = await this.prisma.deliveryChallan.findUnique({
        where: { challanNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `Delivery Challan number "${challanNumber}" already exists.`,
        );
      }
    }

    // Auto-calculate financial totals if not explicitly provided
    let subTotal = 0;
    let taxAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const itemsToCreate = (dto.items || []).map((it, idx) => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.unitPrice) || 0;
      const disc = Number(it.discountPercent) || 0;
      const tax = Number(it.taxPercent) || 0;

      const base = qty * rate;
      const taxable = Math.max(0, base - (base * disc) / 100);

      let itCgst = 0;
      let itSgst = 0;
      let itIgst = 0;

      if (dto.taxType === 'IGST') {
        itIgst = (taxable * tax) / 100;
        igstAmount += itIgst;
      } else if (dto.taxType !== 'NONE') {
        const half = (taxable * (tax / 2)) / 100;
        itCgst = half;
        itSgst = half;
        cgstAmount += itCgst;
        sgstAmount += itSgst;
      }

      subTotal += taxable;
      const itTax = itIgst + itCgst + itSgst;
      taxAmount += itTax;
      const lineTotal = taxable + itTax;

      return {
        productId: it.productId || null,
        uomId: it.uomId || null,
        itemCode: it.itemCode || null,
        itemName: it.itemName.trim(),
        description: it.description || null,
        hsnCode: it.hsnCode || null,
        uom: it.uom || 'Nos',
        batchNumber: it.batchNumber || null,
        quantity: qty,
        unitPrice: rate,
        discountPercent: disc,
        taxPercent: tax,
        cgstAmount: Number(itCgst.toFixed(2)),
        sgstAmount: Number(itSgst.toFixed(2)),
        igstAmount: Number(itIgst.toFixed(2)),
        totalPrice: Number(lineTotal.toFixed(2)),
        sortOrder: it.sortOrder ?? idx,
      };
    });

    const other = Number(dto.otherCharges) || 0;
    const rawTotal = subTotal + taxAmount + other;
    const rounded = Math.round(rawTotal);
    const roundOff = Number((rounded - rawTotal).toFixed(2));
    const totalAmount = rounded;

    return this.prisma.deliveryChallan.create({
      data: {
        challanNumber,
        status: (dto.status as ChallanStatus) || ChallanStatus.DRAFT,
        challanType: (dto.challanType as ChallanType) || ChallanType.SUPPLY,
        challanDate: dto.challanDate ? new Date(dto.challanDate) : new Date(),

        invoiceId: dto.invoiceId || null,
        invoiceNumber: dto.invoiceNumber || null,
        poNumber: dto.poNumber || null,
        eWayBillNumber: dto.eWayBillNumber || null,

        transportMode: dto.transportMode || 'Road',
        vehicleNumber: dto.vehicleNumber?.trim() || null,
        transporterName: dto.transporterName?.trim() || null,
        lrNumber: dto.lrNumber?.trim() || null,
        lrDate: dto.lrDate ? new Date(dto.lrDate) : null,

        customerId: dto.customerId || null,
        supplierId: dto.supplierId || null,
        vendorId: dto.vendorId || null,

        partyName: dto.partyName.trim(),
        partyEmail: dto.partyEmail?.trim() || null,
        partyPhone: dto.partyPhone?.trim() || null,
        partyAddress: dto.partyAddress?.trim() || null,
        partyGstNo: dto.partyGstNo?.trim() || null,
        partyPanNo: dto.partyPanNo?.trim() || null,

        dispatchAddress: dto.dispatchAddress?.trim() || null,
        shippingAddress: dto.shippingAddress?.trim() || dto.partyAddress?.trim() || null,
        placeOfSupply: dto.placeOfSupply?.trim() || 'Telangana (36)',

        currency: dto.currency || 'INR',
        subTotal: dto.subTotal ?? Number(subTotal.toFixed(2)),
        taxType: dto.taxType || 'GST',
        taxAmount: dto.taxAmount ?? Number(taxAmount.toFixed(2)),
        cgstAmount: dto.cgstAmount ?? Number(cgstAmount.toFixed(2)),
        sgstAmount: dto.sgstAmount ?? Number(sgstAmount.toFixed(2)),
        igstAmount: dto.igstAmount ?? Number(igstAmount.toFixed(2)),
        otherCharges: other,
        roundOff: dto.roundOff ?? roundOff,
        totalAmount: dto.totalAmount ?? totalAmount,

        termsAndConditions: dto.termsAndConditions || null,
        notes: dto.notes || null,
        documentUrl: dto.documentUrl || null,
        preparedBy: dto.preparedBy || null,
        approvedBy: dto.approvedBy || null,

        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            uomRelation: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        customer: true,
        supplier: true,
        vendor: true,
      },
    });
  }

  /**
   * Retrieve list of Delivery Challans with pagination, search, and filtering
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    challanType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as ChallanStatus;
    }

    if (query.challanType && query.challanType !== 'ALL') {
      where.challanType = query.challanType as ChallanType;
    }

    if (query.startDate || query.endDate) {
      where.challanDate = {};
      if (query.startDate) {
        where.challanDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.challanDate.lte = new Date(query.endDate);
      }
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { challanNumber: { contains: q, mode: 'insensitive' } },
        { partyName: { contains: q, mode: 'insensitive' } },
        { vehicleNumber: { contains: q, mode: 'insensitive' } },
        { eWayBillNumber: { contains: q, mode: 'insensitive' } },
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { partyGstNo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.deliveryChallan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { challanDate: 'desc' },
        include: {
          items: {
            include: {
              product: true,
              uomRelation: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
          customer: { select: { id: true, name: true, customerCode: true } },
          supplier: { select: { id: true, name: true, code: true } },
          vendor: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.deliveryChallan.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve a single Delivery Challan by ID
   */
  async findOne(id: string) {
    const challan = await this.prisma.deliveryChallan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            uomRelation: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        customer: true,
        supplier: true,
        vendor: true,
      },
    });

    if (!challan || !challan.isActive) {
      throw new NotFoundException(`Delivery Challan with ID "${id}" not found.`);
    }

    return challan;
  }

  /**
   * Update an existing Delivery Challan
   */
  async update(id: string, dto: UpdateDeliveryChallanDto) {
    const existing = await this.findOne(id);

    // If items are provided in update, replace them
    if (dto.items && dto.items.length > 0) {
      await this.prisma.deliveryChallanItem.deleteMany({
        where: { challanId: id },
      });

      let subTotal = 0;
      let taxAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      const taxType = dto.taxType || existing.taxType || 'GST';

      const itemsToCreate = dto.items.map((it, idx) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.unitPrice) || 0;
        const disc = Number(it.discountPercent) || 0;
        const tax = Number(it.taxPercent) || 0;

        const base = qty * rate;
        const taxable = Math.max(0, base - (base * disc) / 100);

        let itCgst = 0;
        let itSgst = 0;
        let itIgst = 0;

        if (taxType === 'IGST') {
          itIgst = (taxable * tax) / 100;
          igstAmount += itIgst;
        } else if (taxType !== 'NONE') {
          const half = (taxable * (tax / 2)) / 100;
          itCgst = half;
          itSgst = half;
          cgstAmount += itCgst;
          sgstAmount += itSgst;
        }

        subTotal += taxable;
        const itTax = itIgst + itCgst + itSgst;
        taxAmount += itTax;
        const lineTotal = taxable + itTax;

        return {
          challanId: id,
          productId: it.productId || null,
          uomId: it.uomId || null,
          itemCode: it.itemCode || null,
          itemName: it.itemName.trim(),
          description: it.description || null,
          hsnCode: it.hsnCode || null,
          uom: it.uom || 'Nos',
          batchNumber: it.batchNumber || null,
          quantity: qty,
          unitPrice: rate,
          discountPercent: disc,
          taxPercent: tax,
          cgstAmount: Number(itCgst.toFixed(2)),
          sgstAmount: Number(itSgst.toFixed(2)),
          igstAmount: Number(itIgst.toFixed(2)),
          totalPrice: Number(lineTotal.toFixed(2)),
          sortOrder: it.sortOrder ?? idx,
        };
      });

      await this.prisma.deliveryChallanItem.createMany({
        data: itemsToCreate,
      });

      const other = dto.otherCharges !== undefined ? Number(dto.otherCharges) : existing.otherCharges;
      const rawTotal = subTotal + taxAmount + other;
      const rounded = Math.round(rawTotal);
      const roundOff = Number((rounded - rawTotal).toFixed(2));
      const totalAmount = rounded;

      dto.subTotal = dto.subTotal ?? Number(subTotal.toFixed(2));
      dto.taxAmount = dto.taxAmount ?? Number(taxAmount.toFixed(2));
      dto.cgstAmount = dto.cgstAmount ?? Number(cgstAmount.toFixed(2));
      dto.sgstAmount = dto.sgstAmount ?? Number(sgstAmount.toFixed(2));
      dto.igstAmount = dto.igstAmount ?? Number(igstAmount.toFixed(2));
      dto.roundOff = dto.roundOff ?? roundOff;
      dto.totalAmount = dto.totalAmount ?? totalAmount;
    }

    const { items, ...updateFields } = dto;

    return this.prisma.deliveryChallan.update({
      where: { id },
      data: {
        ...updateFields,
        status: updateFields.status ? (updateFields.status as ChallanStatus) : undefined,
        challanType: updateFields.challanType ? (updateFields.challanType as ChallanType) : undefined,
        challanDate: updateFields.challanDate ? new Date(updateFields.challanDate) : undefined,
        lrDate: updateFields.lrDate ? new Date(updateFields.lrDate) : undefined,
      },
      include: {
        items: {
          include: {
            product: true,
            uomRelation: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        customer: true,
        supplier: true,
        vendor: true,
      },
    });
  }

  /**
   * Change status of Delivery Challan
   */
  async changeStatus(id: string, status: ChallanStatus) {
    await this.findOne(id);
    return this.prisma.deliveryChallan.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Soft delete a Delivery Challan
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.deliveryChallan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Delivery Challan KPIs & Statistics
   */
  async getStatistics() {
    const [total, drafts, issued, delivered, cancelled, sumResult] =
      await Promise.all([
        this.prisma.deliveryChallan.count({ where: { isActive: true } }),
        this.prisma.deliveryChallan.count({
          where: { isActive: true, status: ChallanStatus.DRAFT },
        }),
        this.prisma.deliveryChallan.count({
          where: { isActive: true, status: ChallanStatus.ISSUED },
        }),
        this.prisma.deliveryChallan.count({
          where: { isActive: true, status: ChallanStatus.DELIVERED },
        }),
        this.prisma.deliveryChallan.count({
          where: { isActive: true, status: ChallanStatus.CANCELLED },
        }),
        this.prisma.deliveryChallan.aggregate({
          where: { isActive: true, status: { not: ChallanStatus.CANCELLED } },
          _sum: { totalAmount: true },
        }),
      ]);

    return {
      totalChallans: total,
      draftCount: drafts,
      issuedCount: issued,
      deliveredCount: delivered,
      cancelledCount: cancelled,
      totalValue: sumResult._sum.totalAmount || 0,
    };
  }
}
