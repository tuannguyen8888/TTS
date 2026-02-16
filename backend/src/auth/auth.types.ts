import { Request } from 'express';
import { TenantRole } from './entities/tenant-membership.entity';

export type JwtAccessPayload = {
  sub: string;
  tenantId?: string;
  role?: TenantRole;
  isSuperAdmin: boolean;
  email: string;
};

export type AuthenticatedRequest = Request & {
  userId?: string;
  tenantId?: string;
  role?: TenantRole;
  isSuperAdmin?: boolean;
  userEmail?: string;
  apiKeyId?: string;
};

