import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { UsageEvent } from './entities/usage-event.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageEvent)
    private repo: Repository<UsageEvent>,
  ) {}

  async record(jobId: string, tenantId: string, charCount: number, status: string) {
    const ev = this.repo.create({
      id: randomUUID(),
      jobId,
      tenantId,
      charCount,
      status,
    });
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(UsageEvent)
      .values(ev)
      .orIgnore()
      .execute();
    return this.repo.findOne({ where: { jobId } });
  }

  async getSummary(tenantId: string, from?: Date, to?: Date) {
    const qb = this.repo.createQueryBuilder('e').where('e.tenantId = :tenantId', { tenantId });
    if (from) qb.andWhere('e.createdAt >= :from', { from });
    if (to) qb.andWhere('e.createdAt <= :to', { to });
    const [list, count] = await qb.getManyAndCount();
    const totalChars = list.reduce((s, e) => s + e.charCount, 0);
    const byStatus = list.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { totalRequests: count, totalChars, byStatus };
  }

  async getTransactions(tenantId: string, from?: Date, to?: Date) {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .orderBy('e.createdAt', 'DESC')
      .take(100);
    if (from) qb.andWhere('e.createdAt >= :from', { from });
    if (to) qb.andWhere('e.createdAt <= :to', { to });
    return qb.getMany();
  }
}
