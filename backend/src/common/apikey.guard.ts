import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApikeyService } from '../apikey/apikey.service';

@Injectable()
export class ApikeyGuard implements CanActivate {
  constructor(
    private apikey: ApikeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.get<boolean>('skipApikey', context.getHandler());
    if (skip) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException({ error: 'MISSING_API_KEY' });
    }
    const info = await this.apikey.validateKey(token);
    if (!info) {
      throw new UnauthorizedException({ error: 'INVALID_API_KEY' });
    }
    (req as Request & { tenantId?: string; apiKeyId?: string }).tenantId = info.tenantId;
    (req as Request & { tenantId?: string; apiKeyId?: string }).apiKeyId = info.keyId;
    return true;
  }
}
