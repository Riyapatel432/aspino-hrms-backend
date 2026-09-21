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
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
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
          include: {
            permission: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
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
    const existing = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name.toUpperCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Role with name '${createRoleDto.name}' already exists`,
      );
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name: createRoleDto.name.toUpperCase().trim(),
          displayName: (createRoleDto.displayName || createRoleDto.name).trim(),
          description: createRoleDto.description,
          isSystem: false,
        },
      });

      if (
        createRoleDto.permissionIds &&
        createRoleDto.permissionIds.length > 0
      ) {
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

    await this.prisma.role.update({
      where: { id },
      data: {
        ...(updateRoleDto.name ? { name: updateRoleDto.name.toUpperCase().trim() } : {}),
        displayName: updateRoleDto.displayName?.trim() ?? (updateRoleDto.name ? updateRoleDto.name.trim() : role.displayName),
        description: updateRoleDto.description ?? role.description,
      },
    });

    return this.findOne(id);
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('System default roles cannot be deleted');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role because it is assigned to ${role._count.users} user(s). Reassign them first.`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: `Role '${role.displayName}' deleted successfully`,
    };
  }

  async assignPermissions(
    id: string,
    assignPermissionsDto: AssignPermissionsDto,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    // Atomic transaction to replace permissions
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      if (
        assignPermissionsDto.permissionIds &&
        assignPermissionsDto.permissionIds.length > 0
      ) {
        // Verify permissions exist
        const validPerms = await tx.permission.findMany({
          where: {
            id: { in: assignPermissionsDto.permissionIds },
          },
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
}
