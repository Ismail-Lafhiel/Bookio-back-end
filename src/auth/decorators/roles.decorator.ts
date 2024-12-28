// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
