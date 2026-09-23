import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const formattedCode = dto.customerCode.trim().toUpperCase();
    const formattedName = dto.name.trim();

    // Check code uniqueness
    const existingCode = await this.prisma.customer.findUnique({
      where: { customerCode: formattedCode },
    });
    if (existingCode) {
      throw new BadRequestException(
        `Customer with code '${formattedCode}' already exists.`,
      );
    }

    const isDomestic =
      dto.isDomestic !== undefined
        ? dto.isDomestic
        : dto.customerType === 'EXPORT'
          ? false
          : true;

    const customerType = dto.customerType
      ? dto.customerType.toUpperCase()
      : isDomestic
        ? 'DOMESTIC'
        : 'EXPORT';

    const country =
      dto.country?.trim() || (isDomestic ? 'India' : 'International');

    const customer = await this.prisma.customer.create({
      data: {
        customerCode: formattedCode,
        name: formattedName,
        billingAddress: dto.billingAddress?.trim() || null,
        shippingAddress: dto.shippingAddress?.trim() || null,
        gstNo: dto.gstNo?.trim().toUpperCase() || null,
        creditTerms: dto.creditTerms?.trim() || null,
        contactPerson: dto.contactPerson?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        customerType,
        isDomestic,
        country,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        notes: dto.notes?.trim() || null,
      },
    });

    return {
      message: 'Customer registered successfully',
      customer,
    };
  }

  async findAll(
    search?: string,
    customerType?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { customerCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { gstNo: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { creditTerms: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (customerType && customerType !== 'ALL') {
      where.customerType = customerType.toUpperCase();
    }

    if (status && status !== 'ALL') {
      where.isActive = status.toLowerCase() === 'active';
    }

    try {
      if (!page && !limit) {
        return await this.prisma.customer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      }

      const total = await this.prisma.customer.count({ where });
      const parsedLimit = limit ? Number(limit) : 10;
      const parsedPage = page ? Number(page) : 1;
      const skip = (parsedPage - 1) * parsedLimit;

      const data = await this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parsedLimit,
      });

      const totalPages = Math.ceil(total / parsedLimit) || 1;

      // Calculate overview metrics (unfiltered/scoped if needed)
      const totalAll = await this.prisma.customer.count();
      const totalDomestic = await this.prisma.customer.count({
        where: { isDomestic: true },
      });
      const totalExport = await this.prisma.customer.count({
        where: { isDomestic: false },
      });
      const totalActive = await this.prisma.customer.count({
        where: { isActive: true },
      });

      return {
        data,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        metrics: {
          totalCustomers: totalAll,
          domesticCustomers: totalDomestic,
          exportCustomers: totalExport,
          activeCustomers: totalActive,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to fetch customers: ${error?.message || 'Database error'}`,
      );
    }
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }

    let formattedCode = existing.customerCode;
    if (
      dto.customerCode &&
      dto.customerCode.trim().toUpperCase() !== existing.customerCode
    ) {
      formattedCode = dto.customerCode.trim().toUpperCase();
      const codeCheck = await this.prisma.customer.findUnique({
        where: { customerCode: formattedCode },
      });
      if (codeCheck) {
        throw new BadRequestException(
          `Customer with code '${formattedCode}' already exists.`,
        );
      }
    }

    let isDomestic = existing.isDomestic;
    if (dto.isDomestic !== undefined) {
      isDomestic = dto.isDomestic;
    } else if (dto.customerType) {
      isDomestic = dto.customerType.toUpperCase() === 'DOMESTIC';
    }

    const customerType = dto.customerType
      ? dto.customerType.toUpperCase()
      : isDomestic
        ? 'DOMESTIC'
        : 'EXPORT';

    let country =
      dto.country !== undefined ? dto.country?.trim() : existing.country;
    if (isDomestic && (!country || country === 'International')) {
      country = 'India';
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        customerCode: formattedCode,
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        billingAddress:
          dto.billingAddress !== undefined
            ? dto.billingAddress?.trim() || null
            : existing.billingAddress,
        shippingAddress:
          dto.shippingAddress !== undefined
            ? dto.shippingAddress?.trim() || null
            : existing.shippingAddress,
        gstNo:
          dto.gstNo !== undefined
            ? dto.gstNo?.trim().toUpperCase() || null
            : existing.gstNo,
        creditTerms:
          dto.creditTerms !== undefined
            ? dto.creditTerms?.trim() || null
            : existing.creditTerms,
        contactPerson:
          dto.contactPerson !== undefined
            ? dto.contactPerson?.trim() || null
            : existing.contactPerson,
        phone:
          dto.phone !== undefined ? dto.phone?.trim() || null : existing.phone,
        email:
          dto.email !== undefined ? dto.email?.trim() || null : existing.email,
        customerType,
        isDomestic,
        country: country || null,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        notes:
          dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
      },
    });

    return {
      message: 'Customer updated successfully',
      customer: updated,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return {
      message: `Customer ${existing.name} (${existing.customerCode}) deleted successfully`,
    };
  }
}
