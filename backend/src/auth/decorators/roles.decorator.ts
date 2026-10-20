import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for role-based access control (T-1.7)
 */
export const ROLES_KEY = 'roles';

/**
 * Role decorator — specify required roles on controllers/methods
 * Usage: @Roles('admin') or @Roles('vendeur', 'admin')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
