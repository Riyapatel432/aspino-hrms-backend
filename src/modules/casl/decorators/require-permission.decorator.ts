import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { Action, AppSubject, RequiredPermission } from '../types/casl.types';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Decorator to require a specific action and resource/subject
 * e.g. @RequirePermission('read', 'employee')
 * e.g. @RequirePermission('manage', 'roles')
 */
export const RequirePermission = (
  action: Action,
  subject: AppSubject,
): CustomDecorator<string> =>
  SetMetadata<string, RequiredPermission>(PERMISSIONS_KEY, { action, subject });
