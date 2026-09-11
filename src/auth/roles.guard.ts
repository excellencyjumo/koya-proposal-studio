import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { StorageService } from '../db/storage.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly storageService: StorageService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException({
        success: false,
        error: 'Forbidden',
        message: 'No authenticated user context present',
        code: 'FORBIDDEN'
      });
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      if (request.params && request.params.id) {
        try {
          this.storageService.addAuditLog(request.params.id, 'authz_denied', user.name || 'Unknown', {
            attempted_action: request.originalUrl || request.url,
            required_roles: requiredRoles,
            actual_role: user.role,
            user_title: user.title,
            reason: `Role '${user.role}' is not authorized to execute this action.`
          });
        } catch {
          // ignore
        }
      }

      throw new ForbiddenException({
        success: false,
        error: 'Forbidden',
        message: `Permission denied. This action requires: ${requiredRoles.join(' or ')}. Current role is '${user.role}'.`,
        code: 'FORBIDDEN_ROLE',
        current_user: {
          name: user.name,
          role: user.role,
          title: user.title
        },
        required_roles: requiredRoles
      });
    }

    return true;
  }
}
