import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    const module = dto.module.toLowerCase().trim();
    const action = dto.action.toLowerCase().trim();
    const application = dto.application.toUpperCase().trim();
    const name = dto.name.toLowerCase().trim();

    // Validate name format: must not contain spaces
    if (/\s/.test(name)) {
      throw new BadRequestException(
        'Permission name must not contain spaces. Use "module:action" or "module-action" format.',
      );
    }

    // Check for uniqueness by name OR by (module + action + application) triple
    const existing = await this.prisma.permission.findFirst({
      where: {
        OR: [
          { name },
          { module, action, application },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Permission '${name}' or '${module}:${action}' already exists`,
      );
    }

    return this.prisma.permission.create({
      data: { name, module, action, application, description: dto.description ?? null },
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

    // Group by application → module
    const grouped: Record<string, Record<string, any[]>> = {};
    for (const p of permissions) {
      if (!grouped[p.application]) grouped[p.application] = {};
      if (!grouped[p.application][p.module]) grouped[p.application][p.module] = [];
      grouped[p.application][p.module].push(p);
    }

    return { total: permissions.length, permissions, grouped };
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: { role: { select: { id: true, name: true, displayName: true } } },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' not found`);
    }

    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto) {
    const existing = await this.findOne(id);

    const newModule = dto.module ? dto.module.toLowerCase().trim() : existing.module;
    const newAction = dto.action ? dto.action.toLowerCase().trim() : existing.action;
    const newApplication = dto.application
      ? dto.application.toUpperCase().trim()
      : existing.application;
    const newName = dto.name ? dto.name.toLowerCase().trim() : existing.name;

    // Check uniqueness on name (if changing)
    if (newName !== existing.name) {
      const nameConflict = await this.prisma.permission.findFirst({
        where: { name: newName, id: { not: id } },
      });
      if (nameConflict) {
        throw new ConflictException(`Permission name '${newName}' already exists`);
      }
    }

    // Check uniqueness on (module + action + application) triple (if changing)
    if (
      newModule !== existing.module ||
      newAction !== existing.action ||
      newApplication !== existing.application
    ) {
      const tripleConflict = await this.prisma.permission.findFirst({
        where: {
          module: newModule,
          action: newAction,
          application: newApplication,
          id: { not: id },
        },
      });
      if (tripleConflict) {
        throw new ConflictException(
          `Permission '${newModule}:${newAction}' already exists in application '${newApplication}'`,
        );
      }
    }

    return this.prisma.permission.update({
      where: { id },
      data: {
        name: newName,
        module: newModule,
        action: newAction,
        application: newApplication,
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  /**
   * Delete a permission.
   * - Removes all role-permission mappings first (in transaction).
   * - Cannot delete if any protected system roles use it (optional future enhancement).
   */
  async remove(id: string) {
    await this.findOne(id); // throws 404 if not found

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { permissionId: id } }),
      this.prisma.permission.delete({ where: { id } }),
    ]);

    return { message: 'Permission deleted successfully' };
  }
}
