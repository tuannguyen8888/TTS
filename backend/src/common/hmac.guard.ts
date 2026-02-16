import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  buildCanonicalString,
  hashBody,
  verifyHmac,
} from './hmac.service';

@Injectable()
export class HmacGuard implements CanActivate {
  private static seenNonces = new Map<string, number>();
  constructor(private config: ConfigService) {}

  private purgeExpiredNonces(nowEpochSec: number) {
    for (const [key, exp] of HmacGuard.seenNonces.entries()) {
      if (exp <= nowEpochSec) HmacGuard.seenNonces.delete(key);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const sig = req.headers['x-hmac-signature'] as string;
    const ts = req.headers['x-hmac-timestamp'] as string;
    const nonce = req.headers['x-hmac-nonce'] as string;

    if (!sig || !ts || !nonce) {
      throw new UnauthorizedException({
        error: 'INVALID_SIGNATURE',
        message: 'Missing X-Hmac-Signature, X-Hmac-Timestamp, or X-Hmac-Nonce',
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const reqTs = parseInt(ts, 10);
    if (isNaN(reqTs) || Math.abs(now - reqTs) > 300) {
      throw new UnauthorizedException({
        error: 'EXPIRED_TIMESTAMP',
        message: 'Timestamp quá cũ hoặc sai',
      });
    }

    const secret = this.config.get('VPS_HMAC_SECRET', '');
    if (!secret) {
      return true;
    }
    this.purgeExpiredNonces(now);
    if (HmacGuard.seenNonces.has(nonce)) {
      throw new UnauthorizedException({
        error: 'REPLAY_DETECTED',
        message: 'Nonce đã được sử dụng',
      });
    }

    const rawBody = (req as Request & { rawBody?: string }).rawBody;
    const body = rawBody ?? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));
    const bodyHash = hashBody(body);
    const path = req.path;
    const method = req.method;
    const canonical = buildCanonicalString(method, path, ts, nonce, bodyHash);

    if (!verifyHmac(secret, canonical, sig)) {
      throw new UnauthorizedException({
        error: 'INVALID_SIGNATURE',
        message: 'Chữ ký không hợp lệ',
      });
    }
    HmacGuard.seenNonces.set(nonce, now + 300);

    return true;
  }
}
