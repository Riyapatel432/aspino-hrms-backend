import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const formattedCode = dto.productCode.trim().toUpperCase();
    const formattedName = dto.name.trim();

    // Check unique product code
    const existingCode = await this.prisma.product.findUnique({
      where: { productCode: formattedCode },
    });

    if (existingCode) {
      throw new BadRequestException(
        `Product with code '${formattedCode}' already exists.`,
      );
    }

    // Verify category
    const category = await this.prisma.productCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Product Category with ID '${dto.categoryId}' does not exist.`,
      );
    }

    // Verify sub-category if provided
    if (dto.subCategoryId) {
      const subCategory = await this.prisma.productSubCategory.findUnique({
        where: { id: dto.subCategoryId },
      });

      if (!subCategory) {
        throw new NotFoundException(
          `Product Sub-Category with ID '${dto.subCategoryId}' does not exist.`,
        );
      }

      if (subCategory.categoryId !== dto.categoryId) {
        throw new BadRequestException(
          `Selected Sub-Category '${subCategory.subCategoryName}' does not belong to the selected Category '${category.categoryName}'.`,
        );
      }
    }

    const product = await this.prisma.product.create({
      data: {
        productCode: formattedCode,
        name: formattedName,
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId || null,
        uom: dto.uom.trim(),
        shelfLife: dto.shelfLife.trim(),
        storageCondition: dto.storageCondition.trim(),
        standardCost: Number(dto.standardCost) || 0.0,
        hsnCode: dto.hsnCode.trim(),
        qcSpecification: dto.qcSpecification?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    return {
      message: 'Product created successfully',
      product,
    };
  }

  async findAll(
    search?: string,
    categoryId?: string,
    subCategoryId?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (categoryId && categoryId.toUpperCase() !== 'ALL') {
      where.categoryId = categoryId;
    }

    if (subCategoryId && subCategoryId.toUpperCase() !== 'ALL') {
      where.subCategoryId = subCategoryId;
    }

    if (status && status.toUpperCase() !== 'ALL') {
      where.isActive = status.toUpperCase() === 'ACTIVE';
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { productCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { hsnCode: { contains: q, mode: 'insensitive' } },
        { qcSpecification: { contains: q, mode: 'insensitive' } },
        { category: { categoryName: { contains: q, mode: 'insensitive' } } },
        {
          subCategory: {
            subCategoryName: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    try {
      if (!page && !limit) {
        const data = await this.prisma.product.findMany({
          where,
          include: {
            category: true,
            subCategory: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        return data;
      }

      const total = await this.prisma.product.count({ where });
      const take = limit ? Number(limit) : 10;
      const parsedPage = page ? Number(page) : 1;
      const skip = (parsedPage - 1) * take;

      const data = await this.prisma.product.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const totalPages = Math.ceil(total / take) || 1;

      // Stats filters
      const searchWhere: any = {};
      if (categoryId && categoryId.toUpperCase() !== 'ALL') {
        searchWhere.categoryId = categoryId;
      }
      if (subCategoryId && subCategoryId.toUpperCase() !== 'ALL') {
        searchWhere.subCategoryId = subCategoryId;
      }
      if (search && search.trim()) {
        const q = search.trim();
        searchWhere.OR = [
          { productCode: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { hsnCode: { contains: q, mode: 'insensitive' } },
          { qcSpecification: { contains: q, mode: 'insensitive' } },
          { category: { categoryName: { contains: q, mode: 'insensitive' } } },
          {
            subCategory: {
              subCategoryName: { contains: q, mode: 'insensitive' },
            },
          },
        ];
      }

      const activeCount = await this.prisma.product.count({
        where: { ...searchWhere, isActive: true },
      });

      const inactiveCount = await this.prisma.product.count({
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
      console.error('Error in ProductService.findAll:', err);
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found.`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);

    if (dto.productCode) {
      const formattedCode = dto.productCode.trim().toUpperCase();
      const duplicate = await this.prisma.product.findUnique({
        where: { productCode: formattedCode },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `Product code '${formattedCode}' is already taken.`,
        );
      }
    }

    const targetCategoryId = dto.categoryId || existing.categoryId;
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Product Category with ID '${dto.categoryId}' does not exist.`,
        );
      }
    }

    if (dto.subCategoryId !== undefined) {
      if (dto.subCategoryId) {
        const subCategory = await this.prisma.productSubCategory.findUnique({
          where: { id: dto.subCategoryId },
        });
        if (!subCategory) {
          throw new NotFoundException(
            `Product Sub-Category with ID '${dto.subCategoryId}' does not exist.`,
          );
        }
        if (subCategory.categoryId !== targetCategoryId) {
          throw new BadRequestException(
            `Selected Sub-Category '${subCategory.subCategoryName}' does not belong to the selected Category.`,
          );
        }
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.productCode && {
          productCode: dto.productCode.trim().toUpperCase(),
        }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.subCategoryId !== undefined && {
          subCategoryId: dto.subCategoryId || null,
        }),
        ...(dto.uom && { uom: dto.uom.trim() }),
        ...(dto.shelfLife && { shelfLife: dto.shelfLife.trim() }),
        ...(dto.storageCondition && {
          storageCondition: dto.storageCondition.trim(),
        }),
        ...(dto.standardCost !== undefined && {
          standardCost: Number(dto.standardCost) || 0.0,
        }),
        ...(dto.hsnCode && { hsnCode: dto.hsnCode.trim() }),
        ...(dto.qcSpecification !== undefined && {
          qcSpecification: dto.qcSpecification?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    return {
      message: 'Product updated successfully',
      product: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: 'Product deleted successfully',
    };
  }
}
