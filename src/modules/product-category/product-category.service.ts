import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductCategoryDto) {
    const formattedCode = dto.categoryCode.trim().toUpperCase();
    const formattedName = dto.categoryName.trim();

    const existingCode = await this.prisma.productCategory.findUnique({
      where: { categoryCode: formattedCode },
    });

    if (existingCode) {
      throw new BadRequestException(
        `Category with code '${formattedCode}' already exists.`,
      );
    }

    const existingName = await this.prisma.productCategory.findFirst({
      where: {
        categoryName: { equals: formattedName, mode: 'insensitive' },
      },
    });

    if (existingName) {
      throw new BadRequestException(
        `Category with name '${formattedName}' already exists.`,
      );
    }

    const category = await this.prisma.productCategory.create({
      data: {
        categoryCode: formattedCode,
        categoryName: formattedName,
        description: dto.description?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return {
      message: 'Product Category created successfully',
      category,
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
        { categoryCode: { contains: q, mode: 'insensitive' } },
        { categoryName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      if (!page && !limit) {
        const data = await this.prisma.productCategory.findMany({
          where,
          include: {
            _count: {
              select: {
                subCategories: true,
                products: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        return data;
      }

      const total = await this.prisma.productCategory.count({ where });
      const take = limit ? Number(limit) : 10;
      const parsedPage = page ? Number(page) : 1;
      const skip = (parsedPage - 1) * take;

      const data = await this.prisma.productCategory.findMany({
        where,
        include: {
          _count: {
            select: {
              subCategories: true,
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const totalPages = Math.ceil(total / take) || 1;

      // Filter independent stats
      const searchWhere: any = {};
      if (search && search.trim()) {
        const q = search.trim();
        searchWhere.OR = [
          { categoryCode: { contains: q, mode: 'insensitive' } },
          { categoryName: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }

      const activeCount = await this.prisma.productCategory.count({
        where: { ...searchWhere, isActive: true },
      });

      const inactiveCount = await this.prisma.productCategory.count({
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
      console.error('Error in ProductCategoryService.findAll:', err);
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
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: {
        subCategories: true,
        products: true,
        _count: {
          select: {
            subCategories: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Product Category with ID '${id}' not found.`,
      );
    }

    return category;
  }

  async update(id: string, dto: UpdateProductCategoryDto) {
    const category = await this.findOne(id);

    if (dto.categoryCode) {
      const formattedCode = dto.categoryCode.trim().toUpperCase();
      const existingCode = await this.prisma.productCategory.findUnique({
        where: { categoryCode: formattedCode },
      });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException(
          `Category code '${formattedCode}' is already taken.`,
        );
      }
    }

    if (dto.categoryName) {
      const formattedName = dto.categoryName.trim();
      const existingName = await this.prisma.productCategory.findFirst({
        where: {
          categoryName: { equals: formattedName, mode: 'insensitive' },
        },
      });
      if (existingName && existingName.id !== id) {
        throw new BadRequestException(
          `Category name '${formattedName}' is already taken.`,
        );
      }
    }

    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(dto.categoryCode && {
          categoryCode: dto.categoryCode.trim().toUpperCase(),
        }),
        ...(dto.categoryName && { categoryName: dto.categoryName.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        _count: {
          select: {
            subCategories: true,
            products: true,
          },
        },
      },
    });

    return {
      message: 'Product Category updated successfully',
      category: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if products exist under this category
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category because it has ${productCount} associated product(s). Please reassign or delete them first.`,
      );
    }

    await this.prisma.productCategory.delete({
      where: { id },
    });

    return {
      message: 'Product Category deleted successfully',
    };
  }
}
