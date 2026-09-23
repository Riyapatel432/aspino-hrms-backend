import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePassCategoryDto } from './dto/create-pass-category.dto';
import { UpdatePassCategoryDto } from './dto/update-pass-category.dto';

@Injectable()
export class PassCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePassCategoryDto) {
    const formattedCode = dto.code.trim().toUpperCase();
    const formattedName = dto.name.trim();

    const existingCode = await this.prisma.passCategory.findUnique({
      where: { code: formattedCode },
    });

    if (existingCode) {
      throw new BadRequestException(
        `Pass category with code '${formattedCode}' already exists.`,
      );
    }

    const existingName = await this.prisma.passCategory.findFirst({
      where: {
        name: { equals: formattedName, mode: 'insensitive' },
        type: dto.type,
      },
    });

    if (existingName) {
      throw new BadRequestException(
        `An ${dto.type} category with name '${formattedName}' already exists.`,
      );
    }

    const category = await this.prisma.passCategory.create({
      data: {
        name: formattedName,
        code: formattedCode,
        type: dto.type,
        description: dto.description?.trim(),
        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'Pass category created successfully',
      category,
    };
  }

  async findAll(type?: string, search?: string, page?: number, limit?: number) {
    const where: any = {};
    if (type && type.toUpperCase() !== 'ALL') {
      where.type = type.toUpperCase() as any;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      if (!page && !limit) {
        return await this.prisma.passCategory.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      }

      const total = await this.prisma.passCategory.count({ where });
      const take = limit ? Number(limit) : undefined;
      const skip =
        page && limit ? (Number(page) - 1) * Number(limit) : undefined;

      const data = await this.prisma.passCategory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const parsedPage = page ? Number(page) : 1;
      const parsedLimit = limit ? Number(limit) : total || 10;
      const totalPages = Math.ceil(total / parsedLimit) || 1;

      // Compute dynamic tab counts based on current search query (ignoring the active tab type filter)
      const countWhere: any = {};
      if (search) {
        countWhere.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const totalInward = await this.prisma.passCategory.count({
        where: {
          ...countWhere,
          type: 'INWARD',
        },
      });

      const totalOutward = await this.prisma.passCategory.count({
        where: {
          ...countWhere,
          type: 'OUTWARD',
        },
      });

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
      console.error('Error in PassCategoryService.findAll:', err);
      if (!page && !limit) {
        return [];
      }
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

  async findOne(id: string) {
    const category = await this.prisma.passCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Pass category with ID ${id} not found.`);
    }
    return category;
  }

  async update(id: string, dto: UpdatePassCategoryDto) {
    const category = await this.findOne(id);

    if (dto.code) {
      const formattedCode = dto.code.trim().toUpperCase();
      const existingCode = await this.prisma.passCategory.findUnique({
        where: { code: formattedCode },
      });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException(
          `Category code '${formattedCode}' is already taken.`,
        );
      }
    }

    const targetType = dto.type || category.type;
    if (dto.name) {
      const formattedName = dto.name.trim();
      const existingName = await this.prisma.passCategory.findFirst({
        where: {
          name: { equals: formattedName, mode: 'insensitive' },
          type: targetType,
        },
      });
      if (existingName && existingName.id !== id) {
        throw new BadRequestException(
          `An ${targetType} category with name '${formattedName}' already exists.`,
        );
      }
    }

    const updated = await this.prisma.passCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.type && { type: dto.type }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      message: 'Pass category updated successfully',
      category: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.passCategory.delete({
      where: { id },
    });
    return {
      message: 'Pass category deleted successfully',
    };
  }
}
