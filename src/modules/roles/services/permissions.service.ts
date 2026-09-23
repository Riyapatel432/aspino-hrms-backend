import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from '../dto/permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findFirst({
      where: {
        OR: [
          { name: dto.name },
          {
            module: dto.module.toLowerCase(),
            action: dto.action.toLowerCase(),
            application: dto.application.toUpperCase(),
          },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Permission '${dto.name}' or '${dto.module}:${dto.action}' already exists.`,
      );
    }

    return this.prisma.permission.create({
      data: {
        name: dto.name,
        module: dto.module.toLowerCase(),
        action: dto.action.toLowerCase(),
        application: dto.application.toUpperCase(),
        description: dto.description || null,
      },
    });
  }

  async findAll(query?: { application?: string; module?: string; search?: string }) {
    const where: any = {};
    if (query?.application && query.application !== 'ALL') {
      where.application = query.application.toUpperCase();
    }
    if (query?.module) {
      where.module = query.module.toLowerCase();
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const permissions = await this.prisma.permission.findMany({
      where,
      orderBy: [{ application: 'asc' }, { module: 'asc' }, { action: 'asc' }],
    });

    const grouped: Record<string, Record<string, any[]>> = {};

    for (const p of permissions) {
      if (!grouped[p.application]) {
        grouped[p.application] = {};
      }
      if (!grouped[p.application][p.module]) {
        grouped[p.application][p.module] = [];
      }
      grouped[p.application][p.module].push(p);
    }

    return {
      total: permissions.length,
      permissions,
      grouped,
    };
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' not found`);
    }

    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto) {
    await this.findOne(id);

    return this.prisma.permission.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.module ? { module: dto.module.toLowerCase() } : {}),
        ...(dto.action ? { action: dto.action.toLowerCase() } : {}),
        ...(dto.application ? { application: dto.application.toUpperCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Delete mappings first
    await this.prisma.rolePermission.deleteMany({
      where: { permissionId: id },
    });

    return this.prisma.permission.delete({
      where: { id },
    });
  }
}
