import { MongoAbility } from '@casl/ability';

/**
 * All valid actions in the permission system.
 * Frontend & backend must use these exact strings.
 */
export type Action =
  | 'manage'   // super-admin wildcard
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import'
  | 'sidebar'; // sidebar visibility permission

/**
 * All valid subjects (modules) in the system.
 * A subject matches the "module" column of the Permission table.
 * Use lowercase_underscore convention.
 */
export type AppSubject =
  | 'all'
  // HRMS core
  | 'employee'
  | 'attendance'
  | 'leave'
  | 'leave_master'
  | 'holiday'
  | 'financial_year'
  | 'department'
  | 'recruitment'
  | 'onboarding'
  | 'performance'
  | 'training'
  | 'payroll'
  | 'exit'
  | 'interview_rounds'
  | 'salary_structures'
  | 'hra_tax'
  | 'loans'
  | 'monthly_run'
  | 'payslips'
  | 'reports'
  // Admin
  | 'roles'
  | 'permissions'
  | 'users'
  | 'profile'
  | 'activity_logs'
  | 'audit'
  // Gate pass
  | 'gatepass'
  | 'pass_category'
  | 'visitor'
  // Supply chain / inventory
  | 'supplier'
  | 'vendor'
  | 'customer'
  | 'bank'
  | 'product'
  | 'product_category'
  | 'product_sub_category'
  | 'storage_location'
  | 'packing_material'
  | 'qc_specification'
  | 'uom'
  // Finance
  | 'quotation'
  | 'purchase_order'
  | 'invoice'
  | 'delivery_challan'
  | 'credit_debit_note'
  | 'customer_ledger'
  | 'supplier_ledger'
  | 'financial_reports'
  | 'vouchers'
  | 'accounts'
  // Misc
  | 'dashboard'
  | 'shift'
  | 'shift_roster'
  | 'training_type'
  | 'resignation_clearance'
  | 'fnf_settlement'
  | 'relieving_letters';

export type AppAbility = MongoAbility<[Action, AppSubject | string]>;

export interface RequiredPermission {
  key: string;
  action: string;
  subject: string;
}
