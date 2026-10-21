import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { users: true, permissions: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
      permissionIds: role.permissions.map((rp) => rp.permissionId),
      rolePermissions: role.permissions.map((rp) => ({
        permissionId: rp.permissionId,
        permission: rp.permission,
      })),
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      users: role.users,
      permissions: role.permissions.map((rp) => rp.permission),
      permissionIds: role.permissions.map((rp) => rp.permissionId),
    };
  }

  async create(createRoleDto: CreateRoleDto) {
    const name = createRoleDto.name.toUpperCase().trim();

    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(`Role '${createRoleDto.name}' already exists`);
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name,
          displayName: (createRoleDto.displayName || createRoleDto.name).trim(),
          description: createRoleDto.description ?? null,
          isSystem: false,
        },
      });

      if (createRoleDto.permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: createRoleDto.permissionIds.map((pId) => ({
            roleId: newRole.id,
            permissionId: pId,
          })),
        });
      }

      return newRole;
    });

    return this.findOne(role.id);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    const newName = updateRoleDto.name
      ? updateRoleDto.name.toUpperCase().trim()
      : undefined;

    // Check uniqueness if name is changing
    if (newName && newName !== role.name) {
      const conflict = await this.prisma.role.findUnique({ where: { name: newName } });
      if (conflict) {
        throw new ConflictException(`Role name '${newName}' already exists`);
      }
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        ...(newName ? { name: newName } : {}),
        displayName:
          updateRoleDto.displayName?.trim() ??
          (updateRoleDto.name ? updateRoleDto.name.trim() : role.displayName),
        description: updateRoleDto.description ?? role.description,
      },
    });

    return this.findOne(id);
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role: it is assigned to ${role._count.users} user(s). Reassign them first.`,
      );
    }

    // Delete role-permission mappings first, then the role
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.role.delete({ where: { id } }),
    ]);

    return { message: `Role '${role.displayName}' deleted successfully` };
  }

  async assignPermissions(id: string, assignPermissionsDto: AssignPermissionsDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove all existing permissions for this role
      await tx.rolePermission.deleteMany({ where: { roleId: id } });

      if (assignPermissionsDto.permissionIds?.length) {
        // Verify each permission exists before assigning
        const validPerms = await tx.permission.findMany({
          where: { id: { in: assignPermissionsDto.permissionIds } },
          select: { id: true },
        });

        await tx.rolePermission.createMany({
          data: validPerms.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        });
      }
    });

    return this.findOne(id);
  }

  /**
   * Duplicate an existing role with all its permissions.
   * New role name = "<original> (Copy)".
   */
  async duplicate(id: string) {
    const source = await this.findOne(id);

    const baseName = `${source.name}_COPY`;
    let candidateName = baseName;
    let suffix = 1;

    // Find a unique name
    while (await this.prisma.role.findUnique({ where: { name: candidateName } })) {
      candidateName = `${baseName}_${suffix++}`;
    }

    const newRole = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: candidateName,
          displayName: `${source.displayName || source.name} (Copy)`,
          description: source.description,
          isSystem: false,
        },
      });

      if (source.permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: source.permissionIds.map((pId) => ({
            roleId: created.id,
            permissionId: pId,
          })),
        });
      }

      return created;
    });

    return this.findOne(newRole.id);
  }
}
