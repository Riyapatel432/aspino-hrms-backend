import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateStorageLocationDto } from './dto/create-storage-location.dto';
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto';

@Injectable()
export class StorageLocationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStorageLocationDto) {
    const formattedCode = dto.locationCode.trim().toUpperCase();

    const existing = await this.prisma.storageLocation.findUnique({
      where: { locationCode: formattedCode },
    });

    if (existing) {
      throw new BadRequestException(
        `Storage Location with code '${formattedCode}' already exists.`,
      );
    }

    const location = await this.prisma.storageLocation.create({
      data: {
        locationCode: formattedCode,
        locationName: dto.locationName.trim(),
        warehouse: dto.warehouse?.trim() || 'Main Warehouse',
        storageCondition: dto.storageCondition.toUpperCase(),
        capacity: dto.capacity.trim(),
        linkedStoreType: dto.linkedStoreType.toUpperCase(),
        temperatureRange: dto.temperatureRange?.trim() || null,
        humidityRange: dto.humidityRange?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return {
      message: 'Storage Location created successfully',
      location,
    };
  }

  async findAll(
    search?: string,
    storageCondition?: string,
    linkedStoreType?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (storageCondition && storageCondition.toUpperCase() !== 'ALL') {
      where.storageCondition = storageCondition.toUpperCase();
    }

    if (linkedStoreType && linkedStoreType.toUpperCase() !== 'ALL') {
      where.linkedStoreType = linkedStoreType.toUpperCase();
    }

    if (status && status.toUpperCase() !== 'ALL') {
      if (status.toUpperCase() === 'ACTIVE') where.isActive = true;
      if (status.toUpperCase() === 'INACTIVE') where.isActive = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { locationCode: { contains: q, mode: 'insensitive' } },
        { locationName: { contains: q, mode: 'insensitive' } },
        { warehouse: { contains: q, mode: 'insensitive' } },
        { capacity: { contains: q, mode: 'insensitive' } },
        { temperatureRange: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [
      totalCount,
      activeCount,
      ambientCount,
      coldCount,
      rawMaterialCount,
      finishedGoodsCount,
    ] = await Promise.all([
      this.prisma.storageLocation.count({ where }),
      this.prisma.storageLocation.count({
        where: { ...where, isActive: true },
      }),
      this.prisma.storageLocation.count({
        where: { ...where, storageCondition: 'AMBIENT' },
      }),
      this.prisma.storageLocation.count({
        where: {
          ...where,
          storageCondition: { in: ['COLD_CHAIN', 'COOL', 'FROZEN'] },
        },
      }),
      this.prisma.storageLocation.count({
        where: { ...where, linkedStoreType: 'RAW_MATERIAL_STORE' },
      }),
      this.prisma.storageLocation.count({
        where: { ...where, linkedStoreType: 'FINISHED_GOODS_STORE' },
      }),
    ]);

    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && limit && page > 0 ? (page - 1) * limit : undefined;

    const locations = await this.prisma.storageLocation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return {
      data: locations,
      meta: {
        total: totalCount,
        active: activeCount,
        ambient: ambientCount,
        cold: coldCount,
        rawMaterial: rawMaterialCount,
        finishedGoods: finishedGoodsCount,
        page: page || 1,
        limit: limit || totalCount,
        totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      },
    };
  }

  async findOne(id: string) {
    const location = await this.prisma.storageLocation.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Storage Location with ID '${id}' not found`);
    }

    return location;
  }

  async update(id: string, dto: UpdateStorageLocationDto) {
    const existing = await this.findOne(id);

    let formattedCode = existing.locationCode;
    if (
      dto.locationCode &&
      dto.locationCode.trim().toUpperCase() !== existing.locationCode
    ) {
      formattedCode = dto.locationCode.trim().toUpperCase();
      const duplicate = await this.prisma.storageLocation.findUnique({
        where: { locationCode: formattedCode },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `Storage Location with code '${formattedCode}' already exists.`,
        );
      }
    }

    const updated = await this.prisma.storageLocation.update({
      where: { id },
      data: {
        locationCode: formattedCode,
        ...(dto.locationName !== undefined && {
          locationName: dto.locationName.trim(),
        }),
        ...(dto.warehouse !== undefined && {
          warehouse: dto.warehouse?.trim() || 'Main Warehouse',
        }),
        ...(dto.storageCondition !== undefined && {
          storageCondition: dto.storageCondition.toUpperCase(),
        }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity.trim() }),
        ...(dto.linkedStoreType !== undefined && {
          linkedStoreType: dto.linkedStoreType.toUpperCase(),
        }),
        ...(dto.temperatureRange !== undefined && {
          temperatureRange: dto.temperatureRange?.trim() || null,
        }),
        ...(dto.humidityRange !== undefined && {
          humidityRange: dto.humidityRange?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      message: 'Storage Location updated successfully',
      location: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.storageLocation.delete({
      where: { id },
    });

    return {
      message: 'Storage Location deleted successfully',
      id,
    };
  }
}
