import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl-ability.factory';
import {
  PERMISSIONS_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // No @RequirePermissions decorator → allow through
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const ability = await this.abilityFactory.createForUser(user.userId);

    // ALL listed permissions must be satisfied
    for (const perm of requiredPermissions) {
      const allowed = ability.can(perm.action as any, perm.subject as any);
      if (!allowed) {
        throw new ForbiddenException(
          `Access denied: missing permission "${perm.key}"`,
        );
      }
    }

    return true;
  }
}
