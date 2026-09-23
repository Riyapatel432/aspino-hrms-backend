import { Injectable, Logger } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Action, AppAbility, AppSubject } from './types/casl.types';

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to retrieve or resolve role relation for user
   */
  private async resolveUserWithRole(userId: string) {
    const user = await this.prisma.user.findUnique({
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
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    // If user already has roleRelation with permissions, return directly
    if (user.roleRelation && user.roleRelation.permissions?.length > 0) {
      return user;
    }

    // Fallback: If roleRelation is missing, attempt lookup via legacy role string.
    // Only attempt if roleId is not yet set (avoids repeated extra queries).
    if (!user.roleId && user.role) {
      const fallbackRole = await this.prisma.role.findFirst({
        where: {
          name: {
            equals: user.role,
            mode: 'insensitive',
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (fallbackRole) {
        // Auto-link user to the role in the database (one-time migration)
        await this.prisma.user.update({
          where: { id: user.id },
          data: { roleId: fallbackRole.id },
        }).catch((e) => this.logger.warn(`Could not update user roleId: ${e.message}`));

        user.roleRelation = fallbackRole;
      }
    }

    return user;
  }

  /**
   * Builds dynamic CASL Ability for the given user from database permissions
   */
  async createForUser(userId: string): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    const user = await this.resolveUserWithRole(userId);

    if (!user || !user.roleRelation) {
      return build();
    }

    const assignedPermissions = user.roleRelation.permissions.map(
      (rp) => rp.permission,
    );

    // 1. Check for universal super admin permission or role
    const isSuperAdmin =
      user.roleRelation.name === 'SUPER_ADMIN' ||
      assignedPermissions.some(
        (p) => p.module === 'all' && p.action === 'manage',
      );

    if (isSuperAdmin) {
      can('manage', 'all');
      return build();
    }

    // 2. Map granular dynamic permissions
    for (const perm of assignedPermissions) {
      const action = perm.action as Action;
      const subject = perm.module as AppSubject;

      can(action, subject);

      // Parse name like "read-training-type"
      if (perm.name) {
        const parts = perm.name.split(/[-_:]/);
        if (parts.length >= 2) {
          const act = parts[0] as Action;
          const sub = parts.slice(1).join('_') as AppSubject;
          const subHyphen = parts.slice(1).join('-') as AppSubject;
          can(act, sub);
          can(act, subHyphen);
        }
      }

      // Explicit module aliases
      if (subject === ('training' as any) || subject === ('training_type' as any)) {
        can(action, 'training' as any);
        can(action, 'training_type' as any);
      }
      if (subject === ('interview_rounds' as any)) {
        can(action, 'interview_rounds' as any);
      }
      if (subject === ('financial_year' as any)) {
        can(action, 'financial_year' as any);
      }
      if (subject === ('leave_master' as any)) {
        can(action, 'leave_master' as any);
      }
      if (subject === ('onboarding' as any)) {
        can(action, 'onboarding' as any);
        can(action, 'employee' as any);
      }
      if (subject === ('resignation_clearance' as any)) {
        can(action, 'resignation_clearance' as any);
        can(action, 'exit' as any);
      }
      if (subject === ('fnf_settlement' as any)) {
        can(action, 'fnf_settlement' as any);
        can(action, 'exit' as any);
      }
      if (subject === ('relieving_letters' as any)) {
        can(action, 'relieving_letters' as any);
        can(action, 'exit' as any);
      }
      if (
        subject === ('salary_structures' as any) ||
        subject === ('hra_tax' as any) ||
        subject === ('loans' as any) ||
        subject === ('monthly_run' as any) ||
        subject === ('payslips' as any) ||
        subject === ('reports' as any)
      ) {
        can(action, 'payroll' as any);
      }
    }

    // 3. Baseline self-service permissions for all authenticated staff
    can('read', 'attendance');
    can('create', 'attendance');
    can('read', 'profile');
    can('update', 'profile');
    can('read', 'leave');
    can('create', 'leave');

    return build();
  }

  /**
   * Helper to retrieve flattened user permissions and role details
   */
  async getUserPermissionsPayload(userId: string) {
    const user = await this.resolveUserWithRole(userId);

    if (!user || !user.roleRelation) {
      return {
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
      permissions.some((p) => p.module === 'all' && p.action === 'manage');

    const baselineRules = [
      { action: 'read', subject: 'attendance' },
      { action: 'create', subject: 'attendance' },
      { action: 'read', subject: 'profile' },
      { action: 'update', subject: 'profile' },
      { action: 'read', subject: 'leave' },
      { action: 'create', subject: 'leave' },
    ];

    const rules = isSuperAdmin
      ? [{ action: 'manage', subject: 'all' }]
      : [
          ...permissions.map((p) => ({
            action: p.action,
            subject: p.module,
          })),
          ...baselineRules,
        ];

    const emp = (user as any).employee;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.roleRelation ? user.roleRelation.name : user.role,
        roleDisplayName: user.roleRelation?.displayName || user.role,
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
      permissions,
      rules,
    };
  }
}
