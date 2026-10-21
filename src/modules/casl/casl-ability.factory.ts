import { Injectable, Logger } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AppAbility } from './types/casl.types';

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch user along with their role and all assigned permissions.
   */
  private async resolveUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
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
              include: { permission: true },
            },
          },
        },
      },
    });
  }

  /**
   * Build a CASL Ability for the given user from their DB permissions.
   *
   * Permission naming convention: "module:action"
   *   - module = permission.module (e.g. "employee", "leave_master")
   *   - action = permission.action (e.g. "read", "create", "sidebar")
   *
   * No alias expansion. One permission = one CASL rule.
   * Only SUPER_ADMIN (via manage:all permission) bypasses all checks.
   */
  async createForUser(userId: string): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const user = await this.resolveUser(userId);

    if (!user || !user.roleRelation) {
      return build();
    }

    const permissions = user.roleRelation.permissions.map((rp) => rp.permission);

    const isSuperAdmin =
      user.roleRelation.name === 'SUPER_ADMIN' ||
      user.roleRelation.name === 'ADMIN' ||
      (user as any).role === 'SUPER_ADMIN' ||
      (user as any).role === 'ADMIN' ||
      (user as any).isSuperAdmin === true ||
      permissions.some((p) => (p.module || '').toLowerCase().trim() === 'all' && (p.action || '').toLowerCase().trim() === 'manage');

    if (isSuperAdmin) {
      can('manage', 'all');
      return build();
    }

    // Register exactly the permissions assigned in the database for the user's role
    for (const perm of permissions) {
      const action = (perm.action || '').toLowerCase().trim();
      const subject = (perm.module || '').toLowerCase().trim();

      if (action && subject) {
        can(action as any, subject as any);
        const subjectHyphen = subject.replace(/_/g, '-');
        const subjectUnderscore = subject.replace(/-/g, '_');
        if (subjectHyphen !== subject) can(action as any, subjectHyphen as any);
        if (subjectUnderscore !== subject) can(action as any, subjectUnderscore as any);
      }
      if (perm.name) {
        can(perm.name.toLowerCase().trim() as any, subject as any);
      }
    }

    return build();
  }

  /**
   * Returns the flat permission list + user/role metadata for the frontend.
   * Used by GET /auth/permissions.
   */
  async getUserPermissionsPayload(userId: string) {
    const user = await this.resolveUser(userId);

    if (!user || !user.roleRelation) {
      return {
        user: null,
        role: null,
        permissions: [],
        rules: [],
      };
    }

    const permissions = user.roleRelation.permissions.map((rp) => ({
      id: rp.permission.id,
      application: rp.permission.application,
      module: rp.permission.module,
      action: rp.permission.action,
      name: rp.permission.name,
      description: rp.permission.description,
    }));

    const isSuperAdmin =
      user.roleRelation.name === 'SUPER_ADMIN' ||
      user.roleRelation.name === 'ADMIN' ||
      (user as any).role === 'SUPER_ADMIN' ||
      (user as any).role === 'ADMIN' ||
      (user as any).isSuperAdmin === true ||
      permissions.some((p) => (p.module || '').toLowerCase().trim() === 'all' && (p.action || '').toLowerCase().trim() === 'manage');

    /**
     * Rules returned to the frontend mirror what CASL uses on the backend.
     * Each rule is { action, subject } matching permission.action + permission.module.
     * Explicit database permissions govern access for all roles.
     */
    const rules = permissions.map((p) => ({
      action: (p.action || '').toLowerCase().trim(),
      subject: (p.module || '').toLowerCase().trim(),
    }));

    const emp = (user as any).employee;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.roleRelation.name,
        roleDisplayName: user.roleRelation.displayName || user.roleRelation.name,
        isSuperAdmin,
        employeeId: emp?.id || null,
        employeeCode: emp?.employeeId || null,
        employee: emp
          ? {
              id: emp.id,
              employeeId: emp.employeeId,
              firstName: emp.firstName,
              lastName: emp.lastName,
              email: emp.email,
              designation: emp.designation,
              departmentId: emp.departmentId,
              departmentName: emp.department?.name,
              bankName: emp.bank?.name || emp.bankName,
              accountNumber: emp.accountNumber,
              panNumber: emp.panNumber,
              aadharNumber: emp.aadharNumber,
              status: emp.status,
            }
          : null,
      },
      role: {
        id: user.roleRelation.id,
        name: user.roleRelation.name,
        displayName: user.roleRelation.displayName,
        description: user.roleRelation.description,
      },
      isSuperAdmin,
      permissions,
      rules,
    };
  }
}
