import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';

@Injectable()
export class ApikeyService {
  constructor(
    @InjectRepository(ApiKey)
    private repo: Repository<ApiKey>,
  ) {}

  async create(tenantId: string): Promise<{ id: string; key: string }> {
    const raw = `vntts_${randomUUID().replace(/-/g, '')}`;
    const hash = createHash('sha256').update(raw).digest('hex');
    const prefix = raw.slice(0, 12);
    const id = randomUUID();
    await this.repo.save(
      this.repo.create({ id, tenantId, keyHash: hash, keyPrefix: prefix, status: 'active' }),
    );
    return { id, key: raw };
  }

  async revoke(id: string, tenantId: string): Promise<boolean> {
    const r = await this.repo.update({ id, tenantId }, { status: 'revoked' });
    return (r.affected ?? 0) > 0;
  }

  async list(tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async validateKey(rawKey: string): Promise<{ tenantId: string; keyId: string } | null> {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const key = await this.repo.findOne({
      where: { keyHash: hash, status: 'active' },
    });
    return key ? { tenantId: key.tenantId, keyId: key.id } : null;
  }
}
