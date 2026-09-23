import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';

@Injectable()
export class UomService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUomDto) {
    const formattedCode = dto.uomCode.trim().toUpperCase();
    const formattedName = dto.uomName.trim();

    const existingCode = await this.prisma.uom.findUnique({
      where: { uomCode: formattedCode },
    });

    if (existingCode) {
      throw new BadRequestException(
        `UOM with code '${formattedCode}' already exists.`,
      );
    }

    const uom = await this.prisma.uom.create({
      data: {
        uomCode: formattedCode,
        uomName: formattedName,
        conversionFactor:
          dto.conversionFactor !== undefined && dto.conversionFactor !== null
            ? Number(dto.conversionFactor)
            : 1.0,
        description: dto.description?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return {
      message: 'UOM created successfully',
      uom,
    };
  }

  async findAll(
    search?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (status && status.toUpperCase() !== 'ALL') {
      where.isActive = status.toUpperCase() === 'ACTIVE';
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { uomCode: { contains: q, mode: 'insensitive' } },
        { uomName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      if (!page && !limit) {
        const data = await this.prisma.uom.findMany({
          where,
          orderBy: { uomCode: 'asc' },
        });
        return data;
      }

      const total = await this.prisma.uom.count({ where });
      const take = limit ? Number(limit) : 10;
      const parsedPage = page ? Number(page) : 1;
      const skip = (parsedPage - 1) * take;

      const data = await this.prisma.uom.findMany({
        where,
        orderBy: { uomCode: 'asc' },
        skip,
        take,
      });

      const totalPages = Math.ceil(total / take) || 1;

      // Stats filters
      const searchWhere: any = {};
      if (search && search.trim()) {
        const q = search.trim();
        searchWhere.OR = [
          { uomCode: { contains: q, mode: 'insensitive' } },
          { uomName: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }

      const activeCount = await this.prisma.uom.count({
        where: { ...searchWhere, isActive: true },
      });

      const inactiveCount = await this.prisma.uom.count({
        where: { ...searchWhere, isActive: false },
      });

      return {
        data,
        total,
        activeCount,
        inactiveCount,
        page: parsedPage,
        limit: take,
        totalPages,
      };
    } catch (err) {
      console.error('Error in UomService.findAll:', err);
      if (!page && !limit) return [];
      return {
        data: [],
        total: 0,
        activeCount: 0,
        inactiveCount: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  }

  async findOne(id: string) {
    const uom = await this.prisma.uom.findUnique({
      where: { id },
    });

    if (!uom) {
      throw new NotFoundException(`UOM with ID '${id}' not found.`);
    }

    return uom;
  }

  async update(id: string, dto: UpdateUomDto) {
    await this.findOne(id);

    if (dto.uomCode) {
      const formattedCode = dto.uomCode.trim().toUpperCase();
      const existingCode = await this.prisma.uom.findUnique({
        where: { uomCode: formattedCode },
      });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException(
          `UOM code '${formattedCode}' is already taken.`,
        );
      }
    }

    const updated = await this.prisma.uom.update({
      where: { id },
      data: {
        ...(dto.uomCode && { uomCode: dto.uomCode.trim().toUpperCase() }),
        ...(dto.uomName && { uomName: dto.uomName.trim() }),
        ...(dto.conversionFactor !== undefined && {
          conversionFactor:
            dto.conversionFactor !== null ? Number(dto.conversionFactor) : 1.0,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      message: 'UOM updated successfully',
      uom: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.uom.delete({
      where: { id },
    });

    return {
      message: 'UOM deleted successfully',
    };
  }
}
