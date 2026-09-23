import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl-ability.factory';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { RequiredPermission } from '../types/casl.types';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission =
      this.reflector.getAllAndOverride<RequiredPermission>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // If no permission decorator is specified, allow through
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const ability = await this.abilityFactory.createForUser(user.userId);

    const isAllowed = ability.can(
      requiredPermission.action,
      requiredPermission.subject,
    );

    if (!isAllowed) {
      throw new ForbiddenException(
        `Access denied: You lack '${requiredPermission.action}' permission on '${requiredPermission.subject}'`,
      );
    }

    return true;
  }
}
