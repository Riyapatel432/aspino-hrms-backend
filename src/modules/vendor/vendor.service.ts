import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVendorDto) {
    const formattedCode = dto.code.trim().toUpperCase();
    const formattedName = dto.name.trim();

    if (/[0-9]/.test(formattedName)) {
      throw new BadRequestException('Numbers are not allowed in Vendor Name.');
    }
    if (dto.contactName && /[0-9]/.test(dto.contactName)) {
      throw new BadRequestException('Numbers are not allowed in Contact Name.');
    }

    // Check code uniqueness
    const existingCode = await this.prisma.vendor.findUnique({
      where: { code: formattedCode },
    });
    if (existingCode) {
      throw new BadRequestException(
        `Vendor with code '${formattedCode}' already exists.`,
      );
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        code: formattedCode,
        name: formattedName,
        serviceType: dto.serviceType?.trim() || 'General',
        address: dto.address?.trim(),
        contactName: dto.contactName?.trim(),
        mobile: dto.mobile?.trim(),
        email: dto.email?.trim(),
        contractReference: dto.contractReference?.trim(),
        approvalStatus: dto.approvalStatus || 'Approved',
      },
    });

    return {
      message: 'Vendor registered successfully',
      vendor,
    };
  }

  async findAll(search?: string, page?: number, limit?: number) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { serviceType: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { contractReference: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      if (!page && !limit) {
        return await this.prisma.vendor.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      }

      const total = await this.prisma.vendor.count({ where });
      const take = limit ? Number(limit) : undefined;
      const skip =
        page && limit ? (Number(page) - 1) * Number(limit) : undefined;

      const data = await this.prisma.vendor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const parsedPage = page ? Number(page) : 1;
      const parsedLimit = limit ? Number(limit) : total || 10;
      const totalPages = Math.ceil(total / parsedLimit) || 1;

      const totalApproved = await this.prisma.vendor.count({
        where: {
          ...where,
          approvalStatus: 'Approved',
        },
      });

      const allMatchedVendors = await this.prisma.vendor.findMany({
        where: {
          ...where,
          serviceType: { not: '' },
        },
        distinct: ['serviceType'],
        select: {
          serviceType: true,
        },
      });
      const totalCategories = allMatchedVendors.filter((v) => v.serviceType).length;

      return {
        data,
        total,
        totalApproved,
        averageRating: 5.0,
        totalCategories,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
      };
    } catch (err) {
      console.error('Error in VendorService.findAll:', err);
      if (!page && !limit) {
        return [];
      }
      return {
        data: [],
        total: 0,
        totalApproved: 0,
        averageRating: 5.0,
        totalCategories: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found.`);
    }
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto) {
    await this.findOne(id);

    if (dto.name && /[0-9]/.test(dto.name.trim())) {
      throw new BadRequestException('Numbers are not allowed in Vendor Name.');
    }

    if (dto.contactName && /[0-9]/.test(dto.contactName.trim())) {
      throw new BadRequestException('Numbers are not allowed in Contact Name.');
    }

    if (dto.code) {
      const formattedCode = dto.code.trim().toUpperCase();
      const existingCode = await this.prisma.vendor.findUnique({
        where: { code: formattedCode },
      });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException(
          `Vendor code '${formattedCode}' is already taken.`,
        );
      }
    }

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.serviceType && { serviceType: dto.serviceType.trim() }),
        ...(dto.address !== undefined && { address: dto.address?.trim() }),
        ...(dto.contactName !== undefined && {
          contactName: dto.contactName?.trim(),
        }),
        ...(dto.mobile !== undefined && { mobile: dto.mobile?.trim() }),
        ...(dto.email !== undefined && { email: dto.email?.trim() }),
        ...(dto.contractReference !== undefined && {
          contractReference: dto.contractReference?.trim(),
        }),
        ...(dto.approvalStatus && { approvalStatus: dto.approvalStatus }),
      },
    });

    return {
      message: 'Vendor updated successfully',
      vendor: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.vendor.delete({
      where: { id },
    });
    return {
      message: 'Vendor deleted successfully',
    };
  }
}
