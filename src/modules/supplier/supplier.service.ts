import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    const formattedCode = dto.code.trim().toUpperCase();
    const formattedName = dto.name.trim();

    // Check code uniqueness
    const existingCode = await this.prisma.supplier.findUnique({
      where: { code: formattedCode },
    });
    if (existingCode) {
      throw new BadRequestException(
        `Supplier with code '${formattedCode}' already exists.`,
      );
    }

    const numBankId = dto.bankId ? Number(dto.bankId) : undefined;

    // Check bank existence if provided
    if (numBankId) {
      const bankExists = await this.prisma.bank.findUnique({
        where: { id: numBankId },
      });
      if (!bankExists) {
        throw new BadRequestException(
          `Bank with ID ${dto.bankId} does not exist.`,
        );
      }
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        code: formattedCode,
        name: formattedName,
        address: dto.address?.trim(),
        gstNo: dto.gstNo.trim().toUpperCase(),
        contactPerson: dto.contactPerson?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        approvedCategories: dto.approvedCategories || [],
        approvalStatus: dto.approvalStatus || 'Approved',
        bankId: numBankId,
        accountNumber: dto.accountNumber?.trim(),
        ifscCode: dto.ifscCode?.trim().toUpperCase(),
        accountName: dto.accountName?.trim(),
        rating: dto.rating ?? 5.0,
        history: dto.history?.trim(),
      },
      include: {
        bank: true,
      },
    });

    return {
      message: 'Supplier registered successfully',
      supplier,
    };
  }

  async findAll(search?: string, page?: number, limit?: number) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { gstNo: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { approvedCategories: { has: search } },
      ];
    }

    try {
      if (!page && !limit) {
        return this.prisma.supplier.findMany({
          where,
          include: {
            bank: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      const total = await this.prisma.supplier.count({ where });
      const take = limit ? Number(limit) : undefined;
      const skip =
        page && limit ? (Number(page) - 1) * Number(limit) : undefined;

      const data = await this.prisma.supplier.findMany({
        where,
        include: {
          bank: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const parsedPage = page ? Number(page) : 1;
      const parsedLimit = limit ? Number(limit) : total || 10;
      const totalPages = Math.ceil(total / parsedLimit) || 1;

      // Calculate aggregated metrics matching search filter
      const totalApproved = await this.prisma.supplier.count({
        where: {
          ...where,
          approvalStatus: 'Approved',
        },
      });

      const aggregateResult = await this.prisma.supplier.aggregate({
        where,
        _avg: {
          rating: true,
        },
      });
      const averageRating = aggregateResult._avg.rating ?? 5.0;

      const allMatchedCategories = await this.prisma.supplier.findMany({
        where,
        select: {
          approvedCategories: true,
        },
      });
      const uniqueCategories = new Set(
        allMatchedCategories.flatMap((s) => s.approvedCategories),
      );
      const totalCategoriesCount = uniqueCategories.size;

      return {
        data,
        total,
        totalApproved,
        averageRating,
        totalCategoriesCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
      };
    } catch (err) {
      console.error('Error in SupplierService.findAll:', err);
      return {
        data: [],
        total: 0,
        totalApproved: 0,
        averageRating: 5.0,
        totalCategoriesCount: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        bank: true,
      },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found.`);
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);

    if (dto.code) {
      const formattedCode = dto.code.trim().toUpperCase();
      const existingCode = await this.prisma.supplier.findUnique({
        where: { code: formattedCode },
      });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException(
          `Supplier code '${formattedCode}' is already taken.`,
        );
      }
    }

    const numBankId = dto.bankId !== undefined ? (dto.bankId ? Number(dto.bankId) : null) : undefined;

    if (numBankId) {
      const bankExists = await this.prisma.bank.findUnique({
        where: { id: numBankId },
      });
      if (!bankExists) {
        throw new BadRequestException(
          `Bank with ID ${dto.bankId} does not exist.`,
        );
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.address !== undefined && { address: dto.address?.trim() }),
        ...(dto.gstNo && { gstNo: dto.gstNo.trim().toUpperCase() }),
        ...(dto.contactPerson !== undefined && {
          contactPerson: dto.contactPerson?.trim(),
        }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() }),
        ...(dto.email !== undefined && { email: dto.email?.trim() }),
        ...(dto.approvedCategories !== undefined && {
          approvedCategories: dto.approvedCategories,
        }),
        ...(dto.approvalStatus && { approvalStatus: dto.approvalStatus }),
        ...(dto.bankId !== undefined && { bankId: numBankId }),
        ...(dto.accountNumber !== undefined && {
          accountNumber: dto.accountNumber?.trim(),
        }),
        ...(dto.ifscCode !== undefined && {
          ifscCode: dto.ifscCode?.trim().toUpperCase(),
        }),
        ...(dto.accountName !== undefined && {
          accountName: dto.accountName?.trim(),
        }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.history !== undefined && { history: dto.history?.trim() }),
      },
      include: {
        bank: true,
      },
    });

    return {
      message: 'Supplier updated successfully',
      supplier: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.supplier.delete({
      where: { id },
    });
    return {
      message: 'Supplier deleted successfully',
    };
  }
}
