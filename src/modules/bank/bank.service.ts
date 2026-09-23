import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBankDto) {
    const formattedName = dto.name.trim();

    // Check name uniqueness
    const existingName = await this.prisma.bank.findUnique({
      where: { name: formattedName },
    });
    if (existingName) {
      throw new BadRequestException(
        `Bank with name '${formattedName}' already exists.`,
      );
    }

    const bank = await this.prisma.bank.create({
      data: {
        name: formattedName,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'Bank created successfully',
      bank,
    };
  }

  async findAll(search?: string, page?: number, limit?: number) {
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    try {
      if (!page && !limit) {
        return await this.prisma.bank.findMany({
          where,
          orderBy: { name: 'asc' },
        });
      }

      const total = await this.prisma.bank.count({ where });
      const take = limit ? Number(limit) : undefined;
      const skip =
        page && limit ? (Number(page) - 1) * Number(limit) : undefined;

      const data = await this.prisma.bank.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
      });

      const parsedPage = page ? Number(page) : 1;
      const parsedLimit = limit ? Number(limit) : total || 10;
      const totalPages = Math.ceil(total / parsedLimit) || 1;

      const countWhere: any = {};
      if (search) {
        countWhere.name = { contains: search, mode: 'insensitive' };
      }

      const totalActive = await this.prisma.bank.count({
        where: {
          ...countWhere,
          isActive: true,
        },
      });

      const totalInactive = await this.prisma.bank.count({
        where: {
          ...countWhere,
          isActive: false,
        },
      });

      return {
        data,
        total,
        totalActive,
        totalInactive,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
      };
    } catch (err) {
      console.error('Error in BankService.findAll:', err);
      if (!page && !limit) {
        return [];
      }
      return {
        data: [],
        total: 0,
        totalActive: 0,
        totalInactive: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  }

  async findOne(id: number | string) {
    const numId = Number(id);
    const bank = await this.prisma.bank.findUnique({
      where: { id: numId },
    });
    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found.`);
    }
    return bank;
  }

  async update(id: number | string, dto: UpdateBankDto) {
    const numId = Number(id);
    await this.findOne(numId);

    if (dto.name) {
      const formattedName = dto.name.trim();
      const existingName = await this.prisma.bank.findUnique({
        where: { name: formattedName },
      });
      if (existingName && existingName.id !== numId) {
        throw new BadRequestException(
          `Bank name '${formattedName}' is already taken.`,
        );
      }
    }

    const updated = await this.prisma.bank.update({
      where: { id: numId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      message: 'Bank updated successfully',
      bank: updated,
    };
  }

  async remove(id: number | string) {
    const numId = Number(id);
    await this.findOne(numId);

    // Check if suppliers are linked to this bank
    const linkedSuppliers = await this.prisma.supplier.findFirst({
      where: { bankId: numId },
    });
    if (linkedSuppliers) {
      throw new BadRequestException(
        'Cannot delete this bank because it is currently linked to one or more suppliers.',
      );
    }

    const linkedEmployees = await this.prisma.employee.findFirst({
      where: { bankId: numId },
    });
    if (linkedEmployees) {
      throw new BadRequestException(
        'Cannot delete this bank because it is currently linked to one or more employees.',
      );
    }

    await this.prisma.bank.delete({
      where: { id: numId },
    });
    return {
      message: 'Bank deleted successfully',
    };
  }
}
