import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductSubCategoryDto } from './dto/create-product-sub-category.dto';
import { UpdateProductSubCategoryDto } from './dto/update-product-sub-category.dto';

@Injectable()
export class ProductSubCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductSubCategoryDto) {
    const formattedCode = dto.subCategoryCode.trim().toUpperCase();
    const formattedName = dto.subCategoryName.trim();

    // Verify linked category exists
    const category = await this.prisma.productCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Linked Product Category with ID '${dto.categoryId}' does not exist.`,
      );
    }

    const existingCode = await this.prisma.productSubCategory.findUnique({
      where: { subCategoryCode: formattedCode },
    });

    if (existingCode) {
      throw new BadRequestException(
        `Sub-Category with code '${formattedCode}' already exists.`,
      );
    }

    const subCategory = await this.prisma.productSubCategory.create({
      data: {
        subCategoryCode: formattedCode,
        subCategoryName: formattedName,
        categoryId: dto.categoryId,
        description: dto.description?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        category: true,
      },
    });

    return {
      message: 'Product Sub-Category created successfully',
      subCategory,
    };
  }

  async findAll(
    search?: string,
    categoryId?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (categoryId && categoryId.toUpperCase() !== 'ALL') {
      where.categoryId = categoryId;
    }

    if (status && status.toUpperCase() !== 'ALL') {
      where.isActive = status.toUpperCase() === 'ACTIVE';
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { subCategoryCode: { contains: q, mode: 'insensitive' } },
        { subCategoryName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { categoryName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    try {
      if (!page && !limit) {
        const data = await this.prisma.productSubCategory.findMany({
          where,
          include: {
            category: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        return data;
      }

      const total = await this.prisma.productSubCategory.count({ where });
      const take = limit ? Number(limit) : 10;
      const parsedPage = page ? Number(page) : 1;
      const skip = (parsedPage - 1) * take;

      const data = await this.prisma.productSubCategory.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const totalPages = Math.ceil(total / take) || 1;

      // Independent filter stats
      const searchWhere: any = {};
      if (categoryId && categoryId.toUpperCase() !== 'ALL') {
        searchWhere.categoryId = categoryId;
      }
      if (search && search.trim()) {
        const q = search.trim();
        searchWhere.OR = [
          { subCategoryCode: { contains: q, mode: 'insensitive' } },
          { subCategoryName: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { categoryName: { contains: q, mode: 'insensitive' } } },
        ];
      }

      const activeCount = await this.prisma.productSubCategory.count({
        where: { ...searchWhere, isActive: true },
      });

      const inactiveCount = await this.prisma.productSubCategory.count({
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
      console.error('Error in ProductSubCategoryService.findAll:', err);
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
    const subCategory = await this.prisma.productSubCategory.findUnique({
      where: { id },
      include: {
        category: true,
        products: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!subCategory) {
      throw new NotFoundException(
        `Product Sub-Category with ID '${id}' not found.`,
      );
    }

    return subCategory;
  }

  async update(id: string, dto: UpdateProductSubCategoryDto) {
    await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Linked Product Category with ID '${dto.categoryId}' does not exist.`,
        );
      }
    }

    if (dto.subCategoryCode) {
      const formattedCode = dto.subCategoryCode.trim().toUpperCase();
      const existingCode = await this.prisma.productSubCategory.findUnique({
        where: { subCategoryCode: formattedCode },
      });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException(
          `Sub-Category code '${formattedCode}' is already taken.`,
        );
      }
    }

    const updated = await this.prisma.productSubCategory.update({
      where: { id },
      data: {
        ...(dto.subCategoryCode && {
          subCategoryCode: dto.subCategoryCode.trim().toUpperCase(),
        }),
        ...(dto.subCategoryName && {
          subCategoryName: dto.subCategoryName.trim(),
        }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return {
      message: 'Product Sub-Category updated successfully',
      subCategory: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    const productCount = await this.prisma.product.count({
      where: { subCategoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete sub-category because it has ${productCount} associated product(s). Please reassign or delete them first.`,
      );
    }

    await this.prisma.productSubCategory.delete({
      where: { id },
    });

    return {
      message: 'Product Sub-Category deleted successfully',
    };
  }
}
