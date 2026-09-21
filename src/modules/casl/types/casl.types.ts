import { MongoAbility } from '@casl/ability';

export type Action =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import';

export type AppSubject =
  | 'all'
  | 'app.hrms'
  | 'app.gatepass'
  | 'employee'
  | 'attendance'
  | 'leave'
  | 'holiday'
  | 'recruitment'
  | 'onboarding'
  | 'performance'
  | 'training'
  | 'payroll'
  | 'exit'
  | 'department'
  | 'gatepass'
  | 'pass_category'
  | 'visitor'
  | 'supplier'
  | 'vendor'
  | 'customer'
  | 'bank'
  | 'product'
  | 'product_category'
  | 'product_sub_category'
  | 'uom'
  | 'packing_material'
  | 'qc_specification'
  | 'storage_location'
  | 'audit'
  | 'users'
  | 'roles'
  | 'permissions';

export type AppAbility = MongoAbility<[Action, AppSubject]>;

export interface RequiredPermission {
  action: Action;
  subject: AppSubject;
}
