import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

export interface RequiredPermission {
  /** The raw "module:action" string, e.g. "employee:read" */
  key: string;
  /** Parsed action, e.g. "read" */
  action: string;
  /** Parsed module/subject, e.g. "employee" */
  subject: string;
}

/**
 * Require one or more permissions formatted as "module:action".
 *
 * Single permission:
 *   @RequirePermissions('employee:create')
 *
 * Multiple permissions (ALL must match):
 *   @RequirePermissions('employee:read', 'employee:update')
 */
export const RequirePermissions = (
  ...permissionKeys: string[]
): CustomDecorator<string> => {
  const parsed: RequiredPermission[] = permissionKeys.map((key) => {
    const parts = key.split(':');
    if (parts.length !== 2) {
      throw new Error(
        `Invalid permission format: "${key}". Expected "module:action" (e.g. "employee:read").`,
      );
    }
    return {
      key,
      subject: parts[0].toLowerCase(),
      action: parts[1].toLowerCase(),
    };
  });
  return SetMetadata<string, RequiredPermission[]>(PERMISSIONS_KEY, parsed);
};

/**
 * @deprecated Use @RequirePermissions('module:action') instead.
 * Legacy two-argument form kept for backward compatibility during migration.
 */
export const RequirePermission = (
  action: string,
  subject: string,
): CustomDecorator<string> => {
  const key = `${subject}:${action}`;
  return SetMetadata<string, RequiredPermission[]>(PERMISSIONS_KEY, [
    { key, subject: subject.toLowerCase(), action: action.toLowerCase() },
  ]);
};
