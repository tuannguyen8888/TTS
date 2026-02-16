import { SetMetadata } from '@nestjs/common';
import { TenantRole } from '../entities/tenant-membership.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TenantRole[]) => SetMetadata(ROLES_KEY, roles);

