import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateMaintenanceItemDto } from './dto/create-maintenance-item.dto';
import { UpdateMaintenanceItemDto } from './dto/update-maintenance-item.dto';
import { CreateMaintenanceRequisitionDto } from './dto/create-maintenance-requisition.dto';
import { CreateMaintenanceIssueDto } from './dto/create-maintenance-issue.dto';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================================
  // 1. ITEM MASTER (SPARES / TOOLS / MAINTENANCE ITEMS)
  // ========================================================

  async createItem(dto: CreateMaintenanceItemDto) {
    const existing = await this.prisma.maintenanceItem.findUnique({
      where: { partNumber: dto.partNumber.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Part number "${dto.partNumber}" already exists in Maintenance Master`,
      );
    }

    return this.prisma.maintenanceItem.create({
      data: {
        partNumber: dto.partNumber.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        category: dto.category,
        equipmentLinkage: dto.equipmentLinkage?.trim(),
        uomId: dto.uomId || undefined,
        uom: dto.uom.trim().toUpperCase(),
        storageBinRack: dto.storageBinRack?.trim(),
        currentStock: dto.currentStock ?? 0.0,
        minimumStock: dto.minimumStock ?? 0.0,
        maximumStock: dto.maximumStock ?? 0.0,
        reorderQuantity: dto.reorderQuantity ?? 0.0,
        unitCost: dto.unitCost ?? 0.0,
        isPreventiveLinked: dto.isPreventiveLinked ?? false,
        pmScheduleReference: dto.pmScheduleReference?.trim(),
        preferredSupplier: dto.preferredSupplier?.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async findAllItems(
    search?: string,
    category?: string,
    lowStockOnly?: boolean,
    equipment?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: any = {};

    if (search) {
      where.OR = [
        { partNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { equipmentLinkage: { contains: search, mode: 'insensitive' } },
        { storageBinRack: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (equipment) {
      where.equipmentLinkage = { contains: equipment, mode: 'insensitive' };
    }

    // Filter items below minimum stock level
    // Note: When lowStockOnly is true, we filter in memory or with raw query if needed,
    // or fetch and filter efficiently.
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.maintenanceItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          uomRelation: {
            select: { id: true, uomCode: true, uomName: true },
          },
        },
      }),
      this.prisma.maintenanceItem.count({ where }),
    ]);

    let finalItems = items;
    if (lowStockOnly) {
      finalItems = items.filter((item) => item.currentStock <= item.minimumStock);
    }

    return {
      data: finalItems,
      total: lowStockOnly ? finalItems.length : total,
      page,
      limit,
      totalPages: Math.ceil((lowStockOnly ? finalItems.length : total) / limit),
    };
  }

  async findOneItem(id: string) {
    const item = await this.prisma.maintenanceItem.findUnique({
      where: { id },
      include: {
        uomRelation: {
          select: { id: true, uomCode: true, uomName: true },
        },
        requisitionItems: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { requisition: true },
        },
        issueItems: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { issue: true },
        },
      },
    });
    if (!item) {
      throw new NotFoundException(`Maintenance item #${id} not found`);
    }
    return item;
  }

  async updateItem(id: string, dto: UpdateMaintenanceItemDto) {
    await this.findOneItem(id);

    if (dto.partNumber) {
      const existing = await this.prisma.maintenanceItem.findUnique({
        where: { partNumber: dto.partNumber.trim() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Part number "${dto.partNumber}" already in use by another item`,
        );
      }
    }

    return this.prisma.maintenanceItem.update({
      where: { id },
      data: {
        ...(dto.partNumber && { partNumber: dto.partNumber.trim() }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.category && { category: dto.category }),
        ...(dto.equipmentLinkage !== undefined && {
          equipmentLinkage: dto.equipmentLinkage?.trim(),
        }),
        ...(dto.uom && { uom: dto.uom.trim().toUpperCase() }),
        ...(dto.uomId !== undefined && { uomId: dto.uomId || null }),
        ...(dto.storageBinRack !== undefined && {
          storageBinRack: dto.storageBinRack?.trim(),
        }),
        ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
        ...(dto.minimumStock !== undefined && { minimumStock: dto.minimumStock }),
        ...(dto.maximumStock !== undefined && { maximumStock: dto.maximumStock }),
        ...(dto.reorderQuantity !== undefined && { reorderQuantity: dto.reorderQuantity }),
        ...(dto.unitCost !== undefined && { unitCost: dto.unitCost }),
        ...(dto.isPreventiveLinked !== undefined && {
          isPreventiveLinked: dto.isPreventiveLinked,
        }),
        ...(dto.pmScheduleReference !== undefined && {
          pmScheduleReference: dto.pmScheduleReference?.trim(),
        }),
        ...(dto.preferredSupplier !== undefined && {
          preferredSupplier: dto.preferredSupplier?.trim(),
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        uomRelation: {
          select: { id: true, uomCode: true, uomName: true },
        },
      },
    });
  }

  async removeItem(id: string) {
    await this.findOneItem(id);
    return this.prisma.maintenanceItem.delete({
      where: { id },
    });
  }

  // ========================================================
  // 2. MINIMUM STOCK ALERTS & PROCUREMENT REQUISITION
  // ========================================================

  async getLowStockAlerts() {
    const allItems = await this.prisma.maintenanceItem.findMany({
      where: { isActive: true },
      orderBy: { currentStock: 'asc' },
    });

    const lowStockItems = allItems.filter(
      (item) => item.currentStock <= item.minimumStock,
    );

    return {
      count: lowStockItems.length,
      items: lowStockItems.map((item) => ({
        id: item.id,
        partNumber: item.partNumber,
        name: item.name,
        category: item.category,
        equipmentLinkage: item.equipmentLinkage,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        shortage: Math.max(0, item.minimumStock - item.currentStock),
        reorderQuantity: item.reorderQuantity || Math.max(1, (item.minimumStock - item.currentStock) * 2),
        uom: item.uom,
        unitCost: item.unitCost,
        preferredSupplier: item.preferredSupplier,
      })),
    };
  }

  // ========================================================
  // 3. REQUISITION FOR MAINTENANCE / WORK ORDER
  // ========================================================

  private async generateRequisitionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.maintenanceRequisition.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `MR-${year}-${sequence}`;
  }

  async createRequisition(dto: CreateMaintenanceRequisitionDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one spare/tool item must be requested');
    }

    const requisitionNumber = await this.generateRequisitionNumber();

    // Verify all item IDs exist and fetch unit cost
    const itemIds = dto.items.map((i) => i.itemId);
    const existingItems = await this.prisma.maintenanceItem.findMany({
      where: { id: { in: itemIds } },
    });

    if (existingItems.length !== itemIds.length) {
      throw new BadRequestException('One or more selected maintenance items do not exist');
    }

    const itemMap = new Map(existingItems.map((i) => [i.id, i]));

    return this.prisma.maintenanceRequisition.create({
      data: {
        requisitionNumber,
        requisitionDate: dto.requisitionDate ? new Date(dto.requisitionDate) : new Date(),
        department: dto.department || 'Maintenance',
        requesterName: dto.requesterName.trim(),
        requesterEmployeeId: dto.requesterEmployeeId?.trim() || null,
        assignedToName: dto.assignedToName?.trim() || null,
        assignedToEmployeeId: dto.assignedToEmployeeId?.trim() || null,
        purpose: dto.purpose.trim(),
        equipmentMachine: dto.equipmentMachine?.trim(),
        workOrderNumber: dto.workOrderNumber?.trim(),
        priority: dto.priority || 'MEDIUM',
        status: 'PENDING_APPROVAL',
        pmScheduleId: dto.pmScheduleId?.trim(),
        remarks: dto.remarks?.trim(),
        items: {
          create: dto.items.map((itemDto) => {
            const masterItem = itemMap.get(itemDto.itemId);
            return {
              itemId: itemDto.itemId,
              requestedQuantity: itemDto.requestedQuantity,
              unitCost: masterItem?.unitCost ?? 0.0,
              remarks: itemDto.remarks?.trim(),
            };
          }),
        },
      },
      include: {
        items: {
          include: { item: true },
        },
      },
    });
  }

  async findAllRequisitions(
    search?: string,
    status?: string,
    priority?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: any = {};

    if (search) {
      where.OR = [
        { requisitionNumber: { contains: search, mode: 'insensitive' } },
        { requesterName: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
        { equipmentMachine: { contains: search, mode: 'insensitive' } },
        { workOrderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    const skip = (page - 1) * limit;

    const [requisitions, total] = await Promise.all([
      this.prisma.maintenanceRequisition.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          requesterEmployee: {
            select: { id: true, employeeId: true, firstName: true, lastName: true, designation: true },
          },
          assignedToEmployee: {
            select: { id: true, employeeId: true, firstName: true, lastName: true, designation: true },
          },
          items: {
            include: { item: true },
          },
          issues: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.maintenanceRequisition.count({ where }),
    ]);

    return {
      data: requisitions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneRequisition(id: string) {
    const req = await this.prisma.maintenanceRequisition.findUnique({
      where: { id },
      include: {
        requesterEmployee: {
          select: { id: true, employeeId: true, firstName: true, lastName: true, designation: true },
        },
        assignedToEmployee: {
          select: { id: true, employeeId: true, firstName: true, lastName: true, designation: true },
        },
        items: {
          include: { item: true },
        },
        issues: {
          include: {
            items: {
              include: { item: true },
            },
          },
        },
      },
    });
    if (!req) {
      throw new NotFoundException(`Maintenance requisition #${id} not found`);
    }
    return req;
  }

  async approveRequisition(id: string, approverName: string) {
    const req = await this.findOneRequisition(id);
    if (req.status !== 'PENDING_APPROVAL' && req.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot approve requisition with status "${req.status}"`,
      );
    }

    return this.prisma.maintenanceRequisition.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverName,
        approvedAt: new Date(),
      },
    });
  }

  async rejectRequisition(id: string, reason?: string) {
    const req = await this.findOneRequisition(id);
    return this.prisma.maintenanceRequisition.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Rejected by Maintenance Authority',
      },
    });
  }

  // ========================================================
  // 4. ISSUE AGAINST APPROVED REQUISITION (STOCK DEDUCTION)
  // ========================================================

  private async generateIssueNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.maintenanceIssue.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `MI-${year}-${sequence}`;
  }

  async issueAgainstRequisition(dto: CreateMaintenanceIssueDto) {
    const requisition = await this.findOneRequisition(dto.requisitionId);

    if (requisition.status !== 'APPROVED' && requisition.status !== 'PARTIALLY_ISSUED') {
      throw new BadRequestException(
        `Items can only be issued against an APPROVED requisition. Current status: ${requisition.status}`,
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be issued');
    }

    const issueNumber = await this.generateIssueNumber();

    // Verify stock availability for all items in transaction
    return this.prisma.$transaction(async (tx) => {
      const issueItemRecords: any[] = [];

      for (const reqIssue of dto.items) {
        const item = await tx.maintenanceItem.findUnique({
          where: { id: reqIssue.itemId },
        });

        if (!item) {
          throw new NotFoundException(`Item #${reqIssue.itemId} not found`);
        }

        if (item.currentStock < reqIssue.quantityIssued) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}" (${item.partNumber}). Available: ${item.currentStock} ${item.uom}, Requested to issue: ${reqIssue.quantityIssued} ${item.uom}`,
          );
        }

        // Deduct current stock
        await tx.maintenanceItem.update({
          where: { id: item.id },
          data: {
            currentStock: item.currentStock - reqIssue.quantityIssued,
          },
        });

        // Update requisition item issuedQuantity
        const reqItem = requisition.items.find((i) => i.itemId === item.id);
        if (reqItem) {
          await tx.maintenanceRequisitionItem.update({
            where: { id: reqItem.id },
            data: {
              issuedQuantity: reqItem.issuedQuantity + reqIssue.quantityIssued,
            },
          });
        }

        issueItemRecords.push({
          itemId: item.id,
          quantityIssued: reqIssue.quantityIssued,
          unitCost: item.unitCost,
          totalCost: item.unitCost * reqIssue.quantityIssued,
          remarks: reqIssue.remarks?.trim(),
        });
      }

      // Create MaintenanceIssue record
      const issue = await tx.maintenanceIssue.create({
        data: {
          issueNumber,
          issueDate: new Date(),
          requisitionId: requisition.id,
          issuedBy: dto.issuedBy.trim(),
          receivedBy: dto.receivedBy.trim(),
          purpose: requisition.purpose,
          equipmentMachine: requisition.equipmentMachine,
          status: 'COMPLETED',
          remarks: dto.remarks?.trim(),
          items: {
            create: issueItemRecords,
          },
        },
        include: {
          items: {
            include: { item: true },
          },
        },
      });

      // Check if all requested items are completely issued
      const updatedReqItems = await tx.maintenanceRequisitionItem.findMany({
        where: { requisitionId: requisition.id },
      });

      const allCompleted = updatedReqItems.every(
        (ri) => ri.issuedQuantity >= ri.requestedQuantity,
      );

      await tx.maintenanceRequisition.update({
        where: { id: requisition.id },
        data: {
          status: allCompleted ? 'ISSUED' : 'PARTIALLY_ISSUED',
        },
      });

      return issue;
    });
  }

  async findAllIssues(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [issues, total] = await Promise.all([
      this.prisma.maintenanceIssue.findMany({
        orderBy: { issueDate: 'desc' },
        include: {
          requisition: true,
          items: {
            include: { item: true },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.maintenanceIssue.count(),
    ]);

    return {
      data: issues,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================================
  // 5. PREVENTIVE MAINTENANCE LINKAGE (SCHEDULES)
  // ========================================================

  async getPmLinkedItems() {
    return this.prisma.maintenanceItem.findMany({
      where: {
        isPreventiveLinked: true,
        isActive: true,
      },
      orderBy: { equipmentLinkage: 'asc' },
    });
  }

  // ========================================================
  // 6. STORE CATEGORY MASTER (DEDICATED FOR MAIN STORE)
  // ========================================================

  async findAllStoreCategories(search?: string, status?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { categoryCode: { contains: search, mode: 'insensitive' } },
        { categoryName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const categories = await (this.prisma as any).storeCategory.findMany({
      where,
      orderBy: { categoryName: 'asc' },
    });
    return { data: categories, total: categories.length };
  }

  async createStoreCategory(data: {
    categoryCode: string;
    categoryName: string;
    description?: string;
    isActive?: boolean;
  }) {
    const existing = await (this.prisma as any).storeCategory.findUnique({
      where: { categoryCode: data.categoryCode.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(
        `Store category code "${data.categoryCode}" already exists`,
      );
    }
    return (this.prisma as any).storeCategory.create({
      data: {
        categoryCode: data.categoryCode.trim().toUpperCase(),
        categoryName: data.categoryName.trim(),
        description: data.description?.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async updateStoreCategory(
    id: string,
    data: {
      categoryCode?: string;
      categoryName?: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const category = await (this.prisma as any).storeCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Store category not found');
    }
    return (this.prisma as any).storeCategory.update({
      where: { id },
      data: {
        ...(data.categoryCode ? { categoryCode: data.categoryCode.trim().toUpperCase() } : {}),
        ...(data.categoryName ? { categoryName: data.categoryName.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async deleteStoreCategory(id: string) {
    return (this.prisma as any).storeCategory.delete({
      where: { id },
    });
  }
}

