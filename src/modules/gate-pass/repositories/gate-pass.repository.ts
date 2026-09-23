import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { GatePass, GatePassStatus, Prisma } from '@prisma/client';

@Injectable()
export class GatePassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.GatePassCreateInput): Promise<GatePass> {
    return this.prisma.gatePass.create({
      data,
      include: { category: true },
    });
  }

  async findAll(
    type?: string,
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<{
    data: GatePass[];
    total: number;
    totalInward: number;
    totalOutward: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Prisma.GatePassWhereInput = {};

    if (type && type !== 'ALL') {
      where.type = type as any;
    }

    if (search) {
      where.OR = [
        { passNumber: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
        { driverName: { contains: search, mode: 'insensitive' } },
        { supplierSource: { contains: search, mode: 'insensitive' } },
        { poNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    try {
      const total = await this.prisma.gatePass.count({ where });

      const countWhere: Prisma.GatePassWhereInput = {};
      if (search) {
        countWhere.OR = [
          { passNumber: { contains: search, mode: 'insensitive' } },
          { vehicleNumber: { contains: search, mode: 'insensitive' } },
          { driverName: { contains: search, mode: 'insensitive' } },
          { supplierSource: { contains: search, mode: 'insensitive' } },
          { poNumber: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const totalInward = await this.prisma.gatePass.count({
        where: {
          ...countWhere,
          type: 'INWARD',
        },
      });

      const totalOutward = await this.prisma.gatePass.count({
        where: {
          ...countWhere,
          type: 'OUTWARD',
        },
      });

      const take = limit ? Number(limit) : undefined;
      const skip =
        page && limit ? (Number(page) - 1) * Number(limit) : undefined;

      const data = await this.prisma.gatePass.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const parsedPage = page ? Number(page) : 1;
      const parsedLimit = limit ? Number(limit) : total || 10;
      const totalPages = Math.ceil(total / parsedLimit) || 1;

      return {
        data,
        total,
        totalInward,
        totalOutward,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
      };
    } catch (err) {
      console.error('Error in GatePassRepository.findAll:', err);
      return {
        data: [],
        total: 0,
        totalInward: 0,
        totalOutward: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  }

  async findById(id: string): Promise<GatePass | null> {
    return this.prisma.gatePass.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async markTimeOut(id: string): Promise<GatePass> {
    return this.prisma.gatePass.update({
      where: { id },
      data: {
        timeOut: new Date(),
        status: GatePassStatus.COMPLETED,
      },
      include: { category: true },
    });
  }

  async linkGrnPo(
    id: string,
    poNumber?: string,
    grnNumber?: string,
  ): Promise<GatePass> {
    return this.prisma.gatePass.update({
      where: { id },
      data: {
        poNumber,
        grnNumber,
      },
      include: { category: true },
    });
  }
}
