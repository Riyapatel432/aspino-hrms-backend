import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    return this.prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        employee: {
          include: {
            department: true,
            bank: true,
          },
        },
        roleRelation: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            bank: true,
          },
        },
        roleRelation: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async create(data: any): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
      include: {
        roleRelation: true,
      },
    });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async updatePasswordByEmail(
    email: string,
    hashedPassword: string,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { password: hashedPassword },
    });
  }

  async findAll(query: PaginationQueryDto & { role?: string } = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { role: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role && query.role !== 'ALL') {
      where.OR = [
        { role: query.role },
        { roleRelation: { name: query.role } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          roleRelation: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: any): Promise<User> {
    if (data.email && typeof data.email === 'string') {
      data.email = data.email.toLowerCase().trim();
    }
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        roleRelation: true,
      },
    });
  }

  async updateRole(id: string, roleId: string): Promise<User> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    return this.prisma.user.update({
      where: { id },
      data: {
        roleId,
        role: role ? role.name : 'USER',
      },
      include: {
        roleRelation: true,
      },
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
