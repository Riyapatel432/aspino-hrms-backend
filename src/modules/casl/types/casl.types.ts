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
  | 'storage_location'
  | 'profile'
  | 'financial_year'
  | 'audit'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'interview_rounds'
  | 'leave_master'
  | 'shift'
  | 'shift_roster'
  | 'accounts'
  | 'activity_logs'
  | 'customer_ledger'
  | 'dashboard'
  | 'financial_reports'
  | 'packing_material'
  | 'product_sub_category'
  | 'qc_specification'
  | 'supplier_ledger'
  | 'uom'
  | 'vouchers';

export type AppAbility = MongoAbility<[Action, AppSubject]>;

export interface RequiredPermission {
  action: Action;
  subject: AppSubject;
}
