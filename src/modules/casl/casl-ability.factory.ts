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

      // Explicit module & plural/singular/hyphen aliases
      if (subject) {
        const strSub = String(subject).toLowerCase();
        const norm = strSub.replace(/_/g, '-') as AppSubject;
        const unnorm = strSub.replace(/-/g, '_') as AppSubject;
        const sing = (strSub.endsWith('s') ? strSub.slice(0, -1) : strSub) as AppSubject;
        const plur = (strSub.endsWith('s') ? strSub : `${strSub}s`) as AppSubject;

        can(action, norm);
        can(action, unnorm);
        can(action, sing);
        can(action, plur);

        if (strSub === 'activity_logs' || strSub === 'activity-logs' || strSub === 'audit') {
          can(action, 'audit' as any);
          can(action, 'activity_logs' as any);
          can(action, 'activity-logs' as any);
        }
        if (strSub === 'gatepass' || strSub === 'gate_pass' || strSub === 'gate-pass') {
          can(action, 'gatepass' as any);
          can(action, 'gate_pass' as any);
          can(action, 'gate-pass' as any);
        }
        if (strSub === 'pass_category' || strSub === 'pass-category' || strSub === 'pass_categories' || strSub === 'pass-categories') {
          can(action, 'pass_category' as any);
          can(action, 'pass-category' as any);
          can(action, 'pass_categories' as any);
          can(action, 'pass-categories' as any);
        }
        if (strSub === 'customer_ledger' || strSub === 'customer-ledger') {
          can(action, 'customer_ledger' as any);
          can(action, 'customer-ledger' as any);
        }
        if (strSub === 'supplier_ledger' || strSub === 'supplier-ledger') {
          can(action, 'supplier_ledger' as any);
          can(action, 'supplier-ledger' as any);
        }
        if (strSub === 'financial_reports' || strSub === 'financial-reports') {
          can(action, 'financial_reports' as any);
          can(action, 'financial-reports' as any);
        }
        if (strSub === 'qc_specification' || strSub === 'qc-specification' || strSub === 'qc_specifications') {
          can(action, 'qc_specification' as any);
          can(action, 'qc-specification' as any);
          can(action, 'qc_specifications' as any);
        }
        if (strSub === 'storage_location' || strSub === 'storage-location' || strSub === 'storage_locations') {
          can(action, 'storage_location' as any);
          can(action, 'storage-location' as any);
          can(action, 'storage_locations' as any);
        }
        if (strSub === 'packing_material' || strSub === 'packing-material' || strSub === 'packing_materials') {
          can(action, 'packing_material' as any);
          can(action, 'packing-material' as any);
          can(action, 'packing_materials' as any);
        }
        if (strSub === 'product_category' || strSub === 'product-category' || strSub === 'product_categories') {
          can(action, 'product_category' as any);
          can(action, 'product-category' as any);
          can(action, 'product_categories' as any);
        }
        if (strSub === 'product_sub_category' || strSub === 'product-sub-category' || strSub === 'product_sub_categories') {
          can(action, 'product_sub_category' as any);
          can(action, 'product-sub-category' as any);
          can(action, 'product_sub_categories' as any);
        }
      }

      // HRMS Module aliases
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
