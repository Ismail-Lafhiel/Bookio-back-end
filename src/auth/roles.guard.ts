import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndMerge<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Check if user exists and has groups
    if (!user || !user.groups) {
      console.log('No user or groups found:', user);
      throw new ForbiddenException('User groups not found');
    }

    const hasRole = requiredRoles.some(role => user.groups.includes(role));
    
    console.log('Authorization check:', {
      userGroups: user.groups,
      requiredRoles,
      hasRole
    });

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to perform this action'
      );
    }

    return true;
  }
}
