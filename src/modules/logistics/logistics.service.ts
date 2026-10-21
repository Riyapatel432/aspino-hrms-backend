import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CreateTransporterDto,
  CreateVehicleDto,
  CreateDriverDto,
  CreateRouteDto,
  CreateShipmentDto,
} from './dto/logistics.dto';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // DASHBOARD METRICS
  // ==========================================
  async getDashboardStats() {
    try {
      const [
        totalShipments,
        pendingDispatches,
        inTransitShipments,
        deliveredShipments,
        totalTransporters,
        totalVehicles,
        activeExcursions,
      ] = await Promise.all([
        (this.prisma as any).logisticsShipment.count(),
        (this.prisma as any).logisticsShipment.count({
          where: { status: { in: ['DRAFT', 'PLANNED', 'APPROVED', 'PICKING', 'PACKED', 'READY_FOR_DISPATCH'] } },
        }),
        (this.prisma as any).logisticsShipment.count({
          where: { status: 'IN_TRANSIT' },
        }),
        (this.prisma as any).logisticsShipment.count({
          where: { status: { in: ['DELIVERED', 'CLOSED'] } },
        }),
        (this.prisma as any).transporter.count({ where: { isActive: true } }),
        (this.prisma as any).logisticsVehicle.count({ where: { isActive: true } }),
        (this.prisma as any).logisticsTemperatureExcursion.count({
          where: { investigationStatus: { in: ['PENDING', 'INVESTIGATING', 'QA_HOLD'] } },
        }),
      ]);

      const recentShipments = await (this.prisma as any).logisticsShipment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          transporter: true,
          vehicle: true,
        },
      });

      return {
        totalShipments,
        pendingDispatches,
        inTransitShipments,
        deliveredShipments,
        totalTransporters,
        totalVehicles,
        activeExcursions,
        recentShipments,
      };
    } catch (e) {
      this.logger.error(`Error in getDashboardStats: ${e.message}`);
      return {
        totalShipments: 0,
        pendingDispatches: 0,
        inTransitShipments: 0,
        deliveredShipments: 0,
        totalTransporters: 0,
        totalVehicles: 0,
        activeExcursions: 0,
        recentShipments: [],
      };
    }
  }

  // ==========================================
  // SUPPLIERS (Master)
  // ==========================================
  async getSuppliers(search?: string) {
    try {
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ];
      }
      return await (this.prisma as any).supplier.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          contactPerson: true,
          phone: true,
          email: true,
          approvalStatus: true,
        },
        orderBy: { name: 'asc' },
      });
    } catch (e) {
      this.logger.error(`Error in getSuppliers: ${e.message}`);
      return [];
    }
  }

  // ==========================================
  // TRANSPORTERS CRUD
  // ==========================================
  async getTransporters() {
    return (this.prisma as any).transporter.findMany({
      include: {
        vehicles: true,
        drivers: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTransporter(dto: CreateTransporterDto) {
    const code = dto.transporterCode || `TRP-${Date.now().toString().slice(-6)}`;
    return (this.prisma as any).transporter.create({
      data: {
        ...dto,
        transporterCode: code,
      },
    });
  }

  async updateTransporter(id: string, dto: Partial<CreateTransporterDto>) {
    return (this.prisma as any).transporter.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTransporter(id: string) {
    return (this.prisma as any).transporter.delete({
      where: { id },
    });
  }

  // ==========================================
  // VEHICLES CRUD
  // ==========================================
  async getVehicles() {
    return (this.prisma as any).logisticsVehicle.findMany({
      include: { transporter: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVehicle(dto: CreateVehicleDto) {
    return (this.prisma as any).logisticsVehicle.create({
      data: dto,
    });
  }

  async updateVehicle(id: string, dto: any) {
    const existing = await (this.prisma as any).logisticsVehicle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    const updateData: any = {};
    if (dto.vehicleNumber) updateData.vehicleNumber = dto.vehicleNumber.trim().toUpperCase();
    if (dto.vehicleType !== undefined) updateData.vehicleType = dto.vehicleType;
    if (dto.transporterId !== undefined) updateData.transporterId = dto.transporterId || null;
    if (dto.capacityWeightKg !== undefined) updateData.capacityWeightKg = Number(dto.capacityWeightKg);
    if (dto.isRefrigerated !== undefined) updateData.isRefrigerated = Boolean(dto.isRefrigerated);
    if (dto.permitDetails !== undefined) updateData.permitDetails = dto.permitDetails;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.gpsDeviceId !== undefined) updateData.gpsDeviceId = dto.gpsDeviceId;

    return (this.prisma as any).logisticsVehicle.update({
      where: { id },
      data: updateData,
      include: { transporter: true },
    });
  }

  async deleteVehicle(id: string) {
    return (this.prisma as any).logisticsVehicle.delete({
      where: { id },
    });
  }

  // ==========================================
  // DRIVERS CRUD
  // ==========================================
  async getDrivers() {
    const list = await (this.prisma as any).logisticsDriver.findMany({
      include: { transporter: true },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((d: any) => ({
      ...d,
      fullName: d.name || d.fullName,
    }));
  }

  async createDriver(dto: any) {
    const code = dto.driverCode || `DRV-${Date.now().toString().slice(-4)}`;
    const name = dto.name || dto.fullName || 'Driver';
    const { fullName, ...rest } = dto;
    const created = await (this.prisma as any).logisticsDriver.create({
      data: {
        ...rest,
        name,
        driverCode: code,
      },
    });
    return {
      ...created,
      fullName: created.name,
    };
  }

  async updateDriver(id: string, dto: any) {
    const existing = await (this.prisma as any).logisticsDriver.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    const updateData: any = {};
    if (dto.name || dto.fullName) updateData.name = (dto.name || dto.fullName).trim();
    if (dto.licenseNumber) updateData.licenseNumber = dto.licenseNumber.trim();
    if (dto.phone) updateData.phone = dto.phone.trim();
    if (dto.transporterId !== undefined) updateData.transporterId = dto.transporterId || null;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await (this.prisma as any).logisticsDriver.update({
      where: { id },
      data: updateData,
      include: { transporter: true },
    });
    return {
      ...updated,
      fullName: updated.name,
    };
  }

  async deleteDriver(id: string) {
    return (this.prisma as any).logisticsDriver.delete({
      where: { id },
    });
  }

  // ==========================================
  // ROUTES CRUD
  // ==========================================
  async getRoutes() {
    const list = await (this.prisma as any).logisticsRoute.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list.map((r: any) => ({
      ...r,
      code: r.routeCode || r.code,
      originCity: r.origin || r.originCity,
      destinationCity: r.destination || r.destinationCity,
      estimatedHours: r.estimatedTimeHours ?? r.estimatedHours ?? 0,
      standardFreightCost: r.tollCharges ?? r.standardFreightCost ?? 12500,
      isReeferCertified: r.transportMode === 'ROAD' || r.isReeferCertified !== false,
      transitRiskLevel: r.transitRiskLevel || 'LOW',
    }));
  }

  async createRoute(dto: any) {
    const code = dto.routeCode || dto.code || `RT-${Date.now().toString().slice(-4)}`;
    const origin = dto.origin || dto.originCity || 'Origin';
    const destination = dto.destination || dto.destinationCity || 'Destination';
    const distanceKm = Number(dto.distanceKm || 0);
    const estimatedTimeHours = Number(dto.estimatedTimeHours || dto.estimatedHours || 0);
    const tollCharges = Number(dto.tollCharges || dto.standardFreightCost || 0);

    return (this.prisma as any).logisticsRoute.create({
      data: {
        routeCode: code,
        origin,
        destination,
        distanceKm,
        estimatedTimeHours,
        tollCharges,
        transportMode: 'ROAD',
      },
    });
  }

  async updateRoute(id: string, dto: any) {
    const updateData: any = {};
    if (dto.origin || dto.originCity) updateData.origin = dto.origin || dto.originCity;
    if (dto.destination || dto.destinationCity) updateData.destination = dto.destination || dto.destinationCity;
    if (dto.distanceKm !== undefined) updateData.distanceKm = Number(dto.distanceKm);
    if (dto.estimatedHours !== undefined || dto.estimatedTimeHours !== undefined) {
      updateData.estimatedTimeHours = Number(dto.estimatedHours ?? dto.estimatedTimeHours);
    }
    if (dto.standardFreightCost !== undefined || dto.tollCharges !== undefined) {
      updateData.tollCharges = Number(dto.standardFreightCost ?? dto.tollCharges);
    }

    return (this.prisma as any).logisticsRoute.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteRoute(id: string) {
    return (this.prisma as any).logisticsRoute.delete({
      where: { id },
    });
  }

  // ==========================================
  // SHIPMENTS & WORKFLOWS
  // ==========================================
  async getShipments(type?: string) {
    const where: any = {};
    if (type) where.type = type;

    return (this.prisma as any).logisticsShipment.findMany({
      where,
      include: {
        transporter: true,
        vehicle: true,
        driver: true,
        route: true,
        items: true,
        trackingEvents: {
          orderBy: { timestamp: 'desc' },
        },
        temperatureLogs: {
          orderBy: { readingTime: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShipmentById(id: string) {
    const shipment = await (this.prisma as any).logisticsShipment.findUnique({
      where: { id },
      include: {
        transporter: true,
        vehicle: true,
        driver: true,
        route: true,
        items: true,
        trackingEvents: { orderBy: { timestamp: 'desc' } },
        temperatureLogs: { orderBy: { readingTime: 'desc' } },
        temperatureExcursions: true,
        freightEntries: true,
        documents: true,
      },
    });
    if (!shipment) throw new NotFoundException('Shipment record not found');
    return shipment;
  }

  async createShipment(dto: any) {
    const year = new Date().getFullYear();
    let shipmentNumber = dto.shipmentNumber;
    if (!shipmentNumber) {
      let counter = (await (this.prisma as any).logisticsShipment.count()) + 1;
      while (true) {
        const candidate = `SHP-${year}-${String(counter).padStart(4, '0')}`;
        const exists = await (this.prisma as any).logisticsShipment.findUnique({
          where: { shipmentNumber: candidate },
          select: { id: true },
        });
        if (!exists) {
          shipmentNumber = candidate;
          break;
        }
        counter++;
      }
    }

    const type = dto.type || dto.direction || 'INBOUND';
    const senderName = dto.senderName || dto.originLocation || 'Supplier Origin';
    const receiverName = dto.receiverName || dto.destinationLocation || 'Receiving Facility';
    const originWarehouse = dto.originWarehouse || dto.originLocation || senderName;
    const destinationWarehouse = dto.destinationWarehouse || dto.destinationLocation || receiverName;
    const isTemperatureSensitive = dto.isTemperatureSensitive ?? dto.requiresColdChain ?? false;
    const requiredMinTemp = dto.requiredMinTemp ?? (dto.minTemperature !== undefined && dto.minTemperature !== '' ? Number(dto.minTemperature) : null);
    const requiredMaxTemp = dto.requiredMaxTemp ?? (dto.maxTemperature !== undefined && dto.maxTemperature !== '' ? Number(dto.maxTemperature) : null);
    const lrNumber = dto.lrNumber || dto.trackingNumber || null;

    const shipmentData: any = {
      shipmentNumber,
      type,
      senderName,
      receiverName,
      originWarehouse,
      destinationWarehouse,
      isTemperatureSensitive,
      requiredMinTemp,
      requiredMaxTemp,
      lrNumber,
      status: 'PLANNED',
      priority: dto.priority || 'NORMAL',
      transporterId: dto.transporterId || undefined,
      vehicleId: dto.vehicleId || undefined,
      driverId: dto.driverId || undefined,
      routeId: dto.routeId || undefined,
      salesOrderId: dto.salesOrderId || undefined,
      purchaseOrderId: dto.purchaseOrderId || undefined,
      remarks: dto.remarks || undefined,
      items: {
        create: (dto.items && dto.items.length > 0 ? dto.items : [
          {
            productCode: 'RAW-MAT',
            productName: 'Pharmaceutical Consignment',
            batchNumber: lrNumber || 'BATCH-001',
            quantity: 1,
            uom: 'CONSIGNMENT',
            qaReleaseStatus: 'RELEASED'
          }
        ]).map((it: any) => ({
          productCode: it.productCode || it.batchNumber || 'PRD-01',
          productName: it.productName || it.itemName || 'Consignment Item',
          batchNumber: it.batchNumber || 'BATCH-001',
          orderedQuantity: Number(it.orderedQuantity || it.quantity) || 1,
          shippedQuantity: Number(it.shippedQuantity || it.quantity || it.orderedQuantity) || 1,
          uom: it.uom || 'NOS',
          qaReleaseStatus: it.qaReleaseStatus || 'RELEASED',
        })),
      },
      trackingEvents: {
        create: {
          status: 'PLANNED',
          locationName: originWarehouse || 'Central Facility',
          eventDetails: 'Shipment created and scheduled in system',
          recordedBy: 'Logistics Coordinator',
        },
      },
    };

    try {
      return await (this.prisma as any).logisticsShipment.create({
        data: shipmentData,
        include: {
          items: true,
          transporter: true,
          vehicle: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error creating shipment: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to create shipment: ${err.message}`);
    }
  }

  async updateShipmentStatus(id: string, status: string, location?: string, remarks?: string) {
    const shipment = await this.getShipmentById(id);

    const updateData: any = { status };
    if (status === 'IN_TRANSIT') updateData.actualDispatchDate = new Date();
    if (status === 'DELIVERED') updateData.actualDeliveryDate = new Date();

    const updated = await (this.prisma as any).logisticsShipment.update({
      where: { id },
      data: updateData,
    });

    // Add tracking event
    await (this.prisma as any).logisticsTrackingEvent.create({
      data: {
        shipmentId: id,
        status: status as any,
        locationName: location || shipment.originWarehouse || 'In-Transit Location',
        eventDetails: remarks || `Status updated to ${status}`,
        recordedBy: 'Logistics System',
      },
    });

    return updated;
  }

  async updateShipment(id: string, dto: any) {
    const shipment = await this.getShipmentById(id);
    const { items, direction, originLocation, destinationLocation, minTemperature, maxTemperature, requiresColdChain, trackingNumber, goodsType, ...rest } = dto;

    const senderName = dto.senderName || originLocation || shipment.senderName;
    const receiverName = dto.receiverName || destinationLocation || shipment.receiverName;
    const originWarehouse = dto.originWarehouse || originLocation || senderName;
    const destinationWarehouse = dto.destinationWarehouse || destinationLocation || receiverName;
    const isTemperatureSensitive = dto.isTemperatureSensitive ?? requiresColdChain ?? shipment.isTemperatureSensitive;
    const requiredMinTemp = dto.requiredMinTemp ?? (minTemperature !== undefined && minTemperature !== '' ? Number(minTemperature) : shipment.requiredMinTemp);
    const requiredMaxTemp = dto.requiredMaxTemp ?? (maxTemperature !== undefined && maxTemperature !== '' ? Number(maxTemperature) : shipment.requiredMaxTemp);
    const lrNumber = dto.lrNumber || trackingNumber || shipment.lrNumber;

    const updateData: any = {
      senderName,
      receiverName,
      originWarehouse,
      destinationWarehouse,
      isTemperatureSensitive,
      requiredMinTemp,
      requiredMaxTemp,
      lrNumber,
      transporterId: dto.transporterId || undefined,
      vehicleId: dto.vehicleId || undefined,
      driverId: dto.driverId || undefined,
      routeId: dto.routeId || undefined,
      remarks: dto.remarks || undefined,
    };

    return (this.prisma as any).logisticsShipment.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        transporter: true,
        vehicle: true,
        driver: true,
      },
    });
  }

  async deleteShipment(id: string) {
    return (this.prisma as any).logisticsShipment.delete({
      where: { id },
    });
  }

  // ==========================================
  // WAREHOUSE TRANSFERS
  // ==========================================
  async getTransfers() {
    const list = await (this.prisma as any).warehouseTransferRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list.map((t: any) => ({
      ...t,
      destWarehouse: t.destWarehouse || t.destinationWarehouse,
      destinationWarehouse: t.destinationWarehouse || t.destWarehouse,
      requiresColdChain: t.notes ? t.notes.includes('Requires Cold Chain') : false,
      minTemperature: 2.0,
      maxTemperature: 8.0,
    }));
  }

  async createTransfer(data: any) {
    const year = new Date().getFullYear();
    let transferNumber = data.transferNumber;
    if (!transferNumber) {
      let counter = (await (this.prisma as any).warehouseTransferRequest.count()) + 1;
      while (true) {
        const candidate = `TR-${year}-${String(counter).padStart(4, '0')}`;
        const exists = await (this.prisma as any).warehouseTransferRequest.findUnique({
          where: { transferNumber: candidate },
          select: { id: true },
        });
        if (!exists) {
          transferNumber = candidate;
          break;
        }
        counter++;
      }
    }

    const sourceWarehouse = data.sourceWarehouse || 'Central Depot';
    const destinationWarehouse = data.destinationWarehouse || data.destWarehouse || 'Regional Depot';
    const reason = data.reason || undefined;
    const requestedBy = data.requestedBy || 'Logistics Officer';
    const notes = data.notes || (data.requiresColdChain ? `Requires Cold Chain (Min: ${data.minTemperature ?? 2}°C, Max: ${data.maxTemperature ?? 8}°C)` : undefined);
    const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [
      {
        productCode: 'RAW-MAT',
        productName: 'Warehouse Transfer Material',
        batchNumber: 'BT-TR-001',
        requestedQty: 1,
        dispatchedQty: 0,
        receivedQty: 0,
        uom: 'NOS'
      }
    ];

    try {
      return await (this.prisma as any).warehouseTransferRequest.create({
        data: {
          transferNumber,
          sourceWarehouse,
          destinationWarehouse,
          reason,
          requestedBy,
          notes,
          items,
          status: 'REQUESTED',
        },
      });
    } catch (err: any) {
      this.logger.error(`Error creating transfer: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to create transfer: ${err.message}`);
    }
  }

  async updateTransfer(id: string, data: any) {
    const updateData: any = {};
    if (data.sourceWarehouse) updateData.sourceWarehouse = data.sourceWarehouse;
    if (data.destinationWarehouse || data.destWarehouse) updateData.destinationWarehouse = data.destinationWarehouse || data.destWarehouse;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.requiresColdChain !== undefined) {
      updateData.notes = data.notes || (data.requiresColdChain ? `Requires Cold Chain (Min: ${data.minTemperature ?? 2}°C, Max: ${data.maxTemperature ?? 8}°C)` : 'Ambient Protocol');
    }
    if (Array.isArray(data.items) && data.items.length > 0) updateData.items = data.items;

    try {
      return await (this.prisma as any).warehouseTransferRequest.update({
        where: { id },
        data: updateData,
      });
    } catch (err: any) {
      this.logger.error(`Error updating transfer: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to update transfer: ${err.message}`);
    }
  }

  async deleteTransfer(id: string) {
    try {
      return await (this.prisma as any).warehouseTransferRequest.delete({
        where: { id },
      });
    } catch (err: any) {
      this.logger.error(`Error deleting transfer: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to delete transfer: ${err.message}`);
    }
  }

  async updateTransferStatus(id: string, status: string, approvedBy?: string) {
    let normalizedStatus = status;
    if (status === 'COMPLETED') normalizedStatus = 'RECEIVED';
    const validStatuses = ['REQUESTED', 'APPROVED', 'REJECTED', 'DISPATCHED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'];
    if (!validStatuses.includes(normalizedStatus)) {
      normalizedStatus = 'RECEIVED';
    }

    const data: any = { status: normalizedStatus };
    if (approvedBy) data.approvedBy = approvedBy;
    if (normalizedStatus === 'DISPATCHED') data.dispatchedDate = new Date();
    if (normalizedStatus === 'RECEIVED') data.receivedDate = new Date();

    try {
      return await (this.prisma as any).warehouseTransferRequest.update({
        where: { id },
        data,
      });
    } catch (err: any) {
      this.logger.error(`Error updating transfer status: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to update transfer status: ${err.message}`);
    }
  }

  // ==========================================
  // RETURNS MANAGEMENT
  // ==========================================
  async getReturns() {
    const list = await (this.prisma as any).logisticsReturn.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list.map((r: any) => {
      const firstItem = Array.isArray(r.items) && r.items.length > 0 ? r.items[0] : {};
      return {
        ...r,
        batchNumber: r.batchNumber || firstItem.batchNumber || 'N/A',
        quantity: r.quantity ?? r.totalReturnedQty ?? firstItem.returnedQty ?? 0,
        uom: r.uom || firstItem.uom || 'BOX',
        qaDisposition: r.disposition,
        qaNotes: r.qaInspectionRemarks,
        temperatureIntegrityMaintained: r.temperatureIntegrityMaintained ?? true,
      };
    });
  }

  async createReturn(data: any) {
    const year = new Date().getFullYear();
    let returnNumber = data.returnNumber;
    if (!returnNumber) {
      let counter = (await (this.prisma as any).logisticsReturn.count()) + 1;
      while (true) {
        const candidate = `RET-${year}-${String(counter).padStart(4, '0')}`;
        const exists = await (this.prisma as any).logisticsReturn.findUnique({
          where: { returnNumber: candidate },
          select: { id: true },
        });
        if (!exists) {
          returnNumber = candidate;
          break;
        }
        counter++;
      }
    }

    // Map UI classifications/reasons to Prisma ReturnType and ReturnReason enums
    let returnType = 'CUSTOMER_RETURN';
    if (data.returnType === 'SUPPLIER_RETURN' || data.returnType === 'VENDOR_RETURN') {
      returnType = 'SUPPLIER_RETURN';
    } else {
      returnType = 'CUSTOMER_RETURN';
    }

    // Map defect/classification reasons to Prisma ReturnReason enum
    const validReasons = [
      'DAMAGED_PRODUCT',
      'EXPIRED_PRODUCT',
      'INCORRECT_PRODUCT',
      'INCORRECT_QUANTITY',
      'QUALITY_COMPLAINT',
      'DELIVERY_REJECTION',
      'RECALL',
      'OTHER',
    ];
    let reason = 'DAMAGED_PRODUCT';
    const rawReason = String(data.reason || data.returnType || '').toUpperCase().trim();
    if (validReasons.includes(data.reason)) {
      reason = data.reason;
    } else if (rawReason.includes('RECALL')) {
      reason = 'RECALL';
    } else if (rawReason.includes('COLD_CHAIN') || rawReason.includes('TEMP') || rawReason.includes('QUALITY')) {
      reason = 'QUALITY_COMPLAINT';
    } else if (rawReason.includes('TRANSIT') || rawReason.includes('DAMAGE')) {
      reason = 'DAMAGED_PRODUCT';
    } else if (rawReason.includes('EXPIRE')) {
      reason = 'EXPIRED_PRODUCT';
    } else if (data.reason && validReasons.includes(rawReason)) {
      reason = rawReason;
    } else {
      reason = 'OTHER';
    }

    const partyName = data.partyName || 'Customer / Client';
    
    let disposition = 'PENDING_INSPECTION';
    if (data.disposition) {
      disposition = this.normalizeDisposition(data.disposition);
    } else if (data.qaDisposition) {
      disposition = this.normalizeDisposition(data.qaDisposition);
    }

    const totalReturnedQty = Number(data.quantity || data.totalReturnedQty || 1);
    const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [
      {
        productCode: data.productCode || 'RET-ITEM',
        productName: data.productName || 'Returned Product',
        batchNumber: data.batchNumber || 'RET-BATCH-001',
        returnedQty: totalReturnedQty,
        acceptedRestockQty: 0,
        rejectedQty: 0,
        uom: data.uom || 'BOX',
        reason: data.reason || 'DAMAGED_PRODUCT'
      }
    ];

    try {
      return await (this.prisma as any).logisticsReturn.create({
        data: {
          returnNumber,
          returnType,
          partyName,
          reason,
          disposition,
          status: 'REQUESTED',
          totalReturnedQty,
          items,
          originalInvoiceNo: data.originalInvoiceNo || undefined,
          originalShipmentNo: data.originalShipmentNo || undefined,
          quarantinedLocation: data.quarantinedLocation || 'Quarantine Bay Q-01',
          qaInspectionRemarks: data.remarks || data.reason || undefined,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error creating return: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to create return: ${err.message}`);
    }
  }

  private normalizeDisposition(val: string): string {
    if (!val) return 'PENDING_INSPECTION';
    const upper = String(val).toUpperCase().trim();
    if (upper === 'RELEASED' || upper === 'RETURN_TO_STOCK' || upper === 'APPROVED_FOR_RESTOCK') {
      return 'APPROVED_FOR_RESTOCK';
    }
    if (upper === 'REJECTED' || upper === 'SCRAP_DESTROY') {
      return 'REJECTED';
    }
    if (upper === 'DESTRUCTION' || upper === 'DESTROY') {
      return 'DESTRUCTION';
    }
    if (upper === 'RETURN_TO_SUPPLIER' || upper === 'RETURN_TO_VENDOR' || upper === 'RTV') {
      return 'RETURN_TO_SUPPLIER';
    }
    if (upper === 'QUARANTINE' || upper === 'HOLD' || upper === 'FURTHER_INVESTIGATION') {
      return 'FURTHER_INVESTIGATION';
    }
    const valid = ['PENDING_INSPECTION', 'APPROVED_FOR_RESTOCK', 'RETURN_TO_SUPPLIER', 'REJECTED', 'DESTRUCTION', 'FURTHER_INVESTIGATION'];
    return valid.includes(upper) ? upper : 'FURTHER_INVESTIGATION';
  }

  async updateReturnDisposition(id: string, bodyOrDisposition: any, remarksParam?: string, qaInspectorParam?: string) {
    let dispositionStr = 'APPROVED_FOR_RESTOCK';
    let remarks = remarksParam;
    let qaInspector = qaInspectorParam || 'QA Officer';

    if (typeof bodyOrDisposition === 'object' && bodyOrDisposition !== null) {
      dispositionStr = bodyOrDisposition.qaDisposition || bodyOrDisposition.disposition || bodyOrDisposition.actionSuggested;
      remarks = bodyOrDisposition.notes || bodyOrDisposition.remarks || bodyOrDisposition.investigationNotes || remarks;
      qaInspector = bodyOrDisposition.qaInspector || qaInspector;
    } else if (typeof bodyOrDisposition === 'string') {
      dispositionStr = bodyOrDisposition;
    }

    const normalizedDisposition = this.normalizeDisposition(dispositionStr);

    try {
      return await (this.prisma as any).logisticsReturn.update({
        where: { id },
        data: {
          disposition: normalizedDisposition as any,
          qaInspectionRemarks: remarks,
          qaInspector,
          qaInspectionDate: new Date(),
          status: 'INSPECTED',
        },
      });
    } catch (err: any) {
      this.logger.error(`Error updating return inspection/disposition: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to update inspection: ${err.message}`);
    }
  }

  async updateReturn(id: string, data: any) {
    try {
      const existing = await (this.prisma as any).logisticsReturn.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Return with ID ${id} not found`);
      }

      const updateData: any = {};
      if (data.partyName) updateData.partyName = data.partyName;
      if (data.returnType) {
        updateData.returnType = (data.returnType === 'SUPPLIER_RETURN' || data.returnType === 'VENDOR_RETURN')
          ? 'SUPPLIER_RETURN'
          : 'CUSTOMER_RETURN';
      }
      if (data.reason) {
        const validReasons = [
          'DAMAGED_PRODUCT',
          'EXPIRED_PRODUCT',
          'INCORRECT_PRODUCT',
          'INCORRECT_QUANTITY',
          'QUALITY_COMPLAINT',
          'DELIVERY_REJECTION',
          'RECALL',
          'OTHER',
        ];
        const rawReason = String(data.reason).toUpperCase().trim();
        if (validReasons.includes(data.reason)) {
          updateData.reason = data.reason;
        } else if (rawReason.includes('RECALL')) {
          updateData.reason = 'RECALL';
        } else if (rawReason.includes('COLD_CHAIN') || rawReason.includes('TEMP') || rawReason.includes('QUALITY')) {
          updateData.reason = 'QUALITY_COMPLAINT';
        } else if (rawReason.includes('TRANSIT') || rawReason.includes('DAMAGE')) {
          updateData.reason = 'DAMAGED_PRODUCT';
        } else if (rawReason.includes('EXPIRE')) {
          updateData.reason = 'EXPIRED_PRODUCT';
        } else if (validReasons.includes(rawReason)) {
          updateData.reason = rawReason;
        } else {
          updateData.reason = 'OTHER';
        }
      }
      if (data.quarantinedLocation) updateData.quarantinedLocation = data.quarantinedLocation;

      const qty = data.quantity ?? data.totalReturnedQty;
      if (qty !== undefined) {
        updateData.totalReturnedQty = Number(qty);
      }

      if (data.batchNumber || data.quantity || data.uom) {
        const currentItems = Array.isArray(existing.items) && existing.items.length > 0 ? existing.items : [{}];
        const updatedFirst = {
          ...currentItems[0],
          batchNumber: data.batchNumber || currentItems[0].batchNumber || 'RET-BATCH-001',
          returnedQty: qty !== undefined ? Number(qty) : currentItems[0].returnedQty || 1,
          uom: data.uom || currentItems[0].uom || 'BOX',
          reason: data.reason || currentItems[0].reason || existing.reason,
        };
        updateData.items = [updatedFirst, ...currentItems.slice(1)];
      }

      return await (this.prisma as any).logisticsReturn.update({
        where: { id },
        data: updateData,
      });
    } catch (err: any) {
      this.logger.error(`Error updating return: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to update return: ${err.message}`);
    }
  }

  async deleteReturn(id: string) {
    try {
      return await (this.prisma as any).logisticsReturn.delete({
        where: { id },
      });
    } catch (err: any) {
      this.logger.error(`Error deleting return: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to delete return: ${err.message}`);
    }
  }

  // ==========================================
  // COLD CHAIN & EXCURSIONS
  // ==========================================
  async logTemperature(shipmentId: string, temp: number, humidity?: number, location?: string) {
    const shipment = await this.getShipmentById(shipmentId);
    let isExcursion = false;

    const minTemp = shipment.requiredMinTemp !== null && shipment.requiredMinTemp !== undefined ? shipment.requiredMinTemp : 2.0;
    const maxTemp = shipment.requiredMaxTemp !== null && shipment.requiredMaxTemp !== undefined ? shipment.requiredMaxTemp : 8.0;

    if (shipment.isTemperatureSensitive || shipment.requiredMinTemp !== null || shipment.requiredMaxTemp !== null) {
      if (temp < minTemp || temp > maxTemp) {
        isExcursion = true;
      }
    } else {
      // Default pharma cold chain criteria
      if (temp < 2.0 || temp > 8.0) {
        isExcursion = true;
      }
    }

    const log = await (this.prisma as any).logisticsTemperatureLog.create({
      data: {
        shipmentId,
        temperature: temp,
        humidity,
        locationStamp: location,
        isExcursion,
      },
    });

    await (this.prisma as any).logisticsShipment.update({
      where: { id: shipmentId },
      data: {
        currentRecordedTemp: temp,
        hasTemperatureExcursion: isExcursion || shipment.hasTemperatureExcursion,
      },
    });

    if (isExcursion) {
      const year = new Date().getFullYear();
      let excNum = '';
      let excCounter = (await (this.prisma as any).logisticsTemperatureExcursion.count()) + 1;
      while (true) {
        const candidate = `EXC-${year}-${String(excCounter).padStart(4, '0')}`;
        const exists = await (this.prisma as any).logisticsTemperatureExcursion.findUnique({
          where: { excursionNumber: candidate },
          select: { id: true },
        });
        if (!exists) {
          excNum = candidate;
          break;
        }
        excCounter++;
      }

      await (this.prisma as any).logisticsTemperatureExcursion.create({
        data: {
          shipmentId,
          excursionNumber: excNum,
          severity: Math.abs(temp - (shipment.requiredMaxTemp || 8)) > 5 ? 'CRITICAL' : 'MEDIUM',
          minRecordedTemp: temp,
          maxRecordedTemp: temp,
          allowableMinTemp: shipment.requiredMinTemp || 2.0,
          allowableMaxTemp: shipment.requiredMaxTemp || 8.0,
          durationMinutes: 15,
          investigationStatus: 'PENDING',
        },
      });
    }

    return log;
  }

  async getExcursions() {
    try {
      return await (this.prisma as any).logisticsTemperatureExcursion.findMany({
        include: {
          shipment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      this.logger.error(`Error in getExcursions: ${e.message}`);
      return [];
    }
  }

  async reviewExcursion(id: string, body: any) {
    try {
      const disposition = body.qaDisposition || body.dispositionAction || 'RELEASED';
      const actionTaken = body.actionTaken || body.correctiveAction || '';
      const qaOfficer = body.qaOfficerName || 'QA Lead';

      let invStatus: string = 'RELEASED';
      if (disposition === 'REJECTED' || disposition === 'DESTROY') {
        invStatus = 'DESTROYED';
      } else if (disposition === 'HOLD' || disposition === 'QUARANTINE') {
        invStatus = 'QA_HOLD';
      } else {
        invStatus = 'RELEASED';
      }

      return await (this.prisma as any).logisticsTemperatureExcursion.update({
        where: { id },
        data: {
          dispositionAction: disposition,
          correctiveAction: actionTaken,
          qaReviewRemarks: actionTaken,
          qaOfficerName: qaOfficer,
          qaSignoffDate: new Date(),
          investigationStatus: invStatus,
        },
        include: {
          shipment: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error reviewing excursion ${id}: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to review excursion: ${err.message}`);
    }
  }
}
