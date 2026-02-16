import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest, JwtAccessPayload } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      throw new UnauthorizedException({ error: 'MISSING_BEARER_TOKEN' });
    }

    try {
      const payload = this.jwt.verify<JwtAccessPayload>(token, {
        secret:
          this.config.get<string>('JWT_ACCESS_SECRET') ??
          this.config.get<string>('JWT_SECRET') ??
          'dev-access-secret',
      });
      req.userId = payload.sub;
      req.tenantId = payload.tenantId;
      req.role = payload.role;
      req.isSuperAdmin = payload.isSuperAdmin;
      req.userEmail = payload.email;
      return true;
    } catch {
      throw new UnauthorizedException({ error: 'INVALID_ACCESS_TOKEN' });
    }
  }
}

