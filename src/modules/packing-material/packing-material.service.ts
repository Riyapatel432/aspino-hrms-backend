import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePackingMaterialDto } from './dto/create-packing-material.dto';
import { UpdatePackingMaterialDto } from './dto/update-packing-material.dto';

@Injectable()
export class PackingMaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePackingMaterialDto) {
    const formattedCode = dto.materialCode.trim().toUpperCase();

    const existing = await this.prisma.packingMaterial.findUnique({
      where: { materialCode: formattedCode },
    });

    if (existing) {
      throw new BadRequestException(
        `Packing Material with code '${formattedCode}' already exists.`,
      );
    }

    const material = await this.prisma.packingMaterial.create({
      data: {
        materialCode: formattedCode,
        type: dto.type.toUpperCase(),
        description: dto.description.trim(),
        approvedSuppliers: dto.approvedSuppliers || [],
        linkedSpecification: dto.linkedSpecification?.trim() || null,
        uom: dto.uom.trim(),
        standardCost: Number(dto.standardCost) || 0.0,
        minimumStock:
          dto.minimumStock !== undefined ? Number(dto.minimumStock) : 0.0,
        storageCondition: dto.storageCondition?.trim() || 'Ambient',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return {
      message: 'Packing Material created successfully',
      material,
    };
  }

  async findAll(
    search?: string,
    type?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (type && type.toUpperCase() !== 'ALL') {
      where.type = type.toUpperCase();
    }

    if (status && status.toUpperCase() !== 'ALL') {
      if (status.toUpperCase() === 'ACTIVE') where.isActive = true;
      if (status.toUpperCase() === 'INACTIVE') where.isActive = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { materialCode: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { uom: { contains: q, mode: 'insensitive' } },
        { linkedSpecification: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Counts for dashboard tabs
    const [
      totalCount,
      activeCount,
      inactiveCount,
      primaryCount,
      secondaryCount,
    ] = await Promise.all([
      this.prisma.packingMaterial.count({ where }),
      this.prisma.packingMaterial.count({
        where: { ...where, isActive: true },
      }),
      this.prisma.packingMaterial.count({
        where: { ...where, isActive: false },
      }),
      this.prisma.packingMaterial.count({
        where: { ...where, type: 'PRIMARY' },
      }),
      this.prisma.packingMaterial.count({
        where: { ...where, type: 'SECONDARY' },
      }),
    ]);

    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && limit && page > 0 ? (page - 1) * limit : undefined;

    const materials = await this.prisma.packingMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return {
      data: materials,
      meta: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        primary: primaryCount,
        secondary: secondaryCount,
        page: page || 1,
        limit: limit || totalCount,
        totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      },
    };
  }

  async findOne(id: string) {
    const material = await this.prisma.packingMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException(`Packing Material with ID '${id}' not found`);
    }

    return material;
  }

  async update(id: string, dto: UpdatePackingMaterialDto) {
    const existing = await this.findOne(id);

    let formattedCode = existing.materialCode;
    if (
      dto.materialCode &&
      dto.materialCode.trim().toUpperCase() !== existing.materialCode
    ) {
      formattedCode = dto.materialCode.trim().toUpperCase();
      const duplicate = await this.prisma.packingMaterial.findUnique({
        where: { materialCode: formattedCode },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `Packing Material with code '${formattedCode}' already exists.`,
        );
      }
    }

    const updated = await this.prisma.packingMaterial.update({
      where: { id },
      data: {
        materialCode: formattedCode,
        ...(dto.type !== undefined && { type: dto.type.toUpperCase() }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.approvedSuppliers !== undefined && {
          approvedSuppliers: dto.approvedSuppliers,
        }),
        ...(dto.linkedSpecification !== undefined && {
          linkedSpecification: dto.linkedSpecification?.trim() || null,
        }),
        ...(dto.uom !== undefined && { uom: dto.uom.trim() }),
        ...(dto.standardCost !== undefined && {
          standardCost: Number(dto.standardCost) || 0.0,
        }),
        ...(dto.minimumStock !== undefined && {
          minimumStock: Number(dto.minimumStock) || 0.0,
        }),
        ...(dto.storageCondition !== undefined && {
          storageCondition: dto.storageCondition?.trim() || 'Ambient',
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      message: 'Packing Material updated successfully',
      material: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.packingMaterial.delete({
      where: { id },
    });

    return {
      message: 'Packing Material deleted successfully',
      id,
    };
  }
}
