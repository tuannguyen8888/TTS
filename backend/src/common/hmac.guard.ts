import {
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createClient } from 'redis';
import {
  buildCanonicalString,
  hashBody,
  verifyHmac,
} from './hmac.service';

const NONCE_TTL_SECONDS = 300;
const NONCE_KEY_PREFIX = 'hmac:nonce:';

@Injectable()
export class HmacGuard implements CanActivate {
  private static redisClient: ReturnType<typeof createClient> | null = null;
  private static redisConnectPromise:
    | Promise<ReturnType<typeof createClient>>
    | null = null;

  constructor(private config: ConfigService) {}

  private getHmacVerificationSecrets(): string[] {
    const candidates = [
      this.config.get<string>('VPS_HMAC_SECRET_CURRENT'),
      this.config.get<string>('VPS_HMAC_SECRET_PREVIOUS'),
      this.config.get<string>('VPS_HMAC_SECRET'),
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value);
    return Array.from(new Set(candidates));
  }

  private async getRedisClient(): Promise<ReturnType<typeof createClient>> {
    if (HmacGuard.redisClient?.isOpen) {
      return HmacGuard.redisClient;
    }

    if (!HmacGuard.redisConnectPromise) {
      const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
      if (!redisUrl) {
        throw new InternalServerErrorException({
          error: 'REDIS_URL_NOT_CONFIGURED',
        });
      }

      const client = createClient({ url: redisUrl });
      HmacGuard.redisConnectPromise = client
        .connect()
        .then(() => {
          HmacGuard.redisClient = client;
          return client;
        })
        .catch((error: unknown) => {
          HmacGuard.redisConnectPromise = null;
          const message =
            error instanceof Error
              ? error.message
              : 'NONCE_STORE_UNAVAILABLE';
          throw new InternalServerErrorException({
            error: 'NONCE_STORE_UNAVAILABLE',
            message,
          });
        });
    }

    return HmacGuard.redisConnectPromise;
  }

  private async markNonceUsedOnce(nonce: string): Promise<boolean> {
    const client = await this.getRedisClient();
    const key = `${NONCE_KEY_PREFIX}${nonce}`;
    const result = await client.set(key, '1', {
      EX: NONCE_TTL_SECONDS,
      NX: true,
    });
    return result === 'OK';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const secrets = this.getHmacVerificationSecrets();
    if (secrets.length === 0) {
      throw new InternalServerErrorException({
        error: 'HMAC_SECRET_NOT_CONFIGURED',
      });
    }

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
    if (isNaN(reqTs) || Math.abs(now - reqTs) > NONCE_TTL_SECONDS) {
      throw new UnauthorizedException({
        error: 'EXPIRED_TIMESTAMP',
        message: 'Timestamp quá cũ hoặc sai',
      });
    }

    const rawBody = (req as Request & { rawBody?: string }).rawBody;
    const body =
      rawBody ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));
    const bodyHash = hashBody(body);
    const path = req.path;
    const method = req.method;
    const canonical = buildCanonicalString(method, path, ts, nonce, bodyHash);

    const verified = secrets.some((secret) =>
      verifyHmac(secret, canonical, sig),
    );
    if (!verified) {
      throw new UnauthorizedException({
        error: 'INVALID_SIGNATURE',
        message: 'Chữ ký không hợp lệ',
      });
    }

    const nonceAccepted = await this.markNonceUsedOnce(nonce);
    if (!nonceAccepted) {
      throw new UnauthorizedException({
        error: 'REPLAY_DETECTED',
        message: 'Nonce đã được sử dụng',
      });
    }

    return true;
  }
}
