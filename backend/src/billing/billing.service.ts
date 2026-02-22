import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BillingLedger } from './entities/billing-ledger.entity';

const PRICE_PER_CHAR = 0.0001;

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingLedger)
    private repo: Repository<BillingLedger>,
  ) {}

  async record(jobId: string, tenantId: string, charCount: number) {
    const month = new Date().toISOString().slice(0, 7);
    const amount = (charCount * PRICE_PER_CHAR).toFixed(4);
    const entry = this.repo.create({
      id: randomUUID(),
      jobId,
      tenantId,
      charCount,
      amount,
      month,
    });
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(BillingLedger)
      .values(entry)
      .orIgnore()
      .execute();
    return this.repo.findOne({ where: { jobId } });
  }

  async getLedger(tenantId: string, month?: string) {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .orderBy('e.createdAt', 'DESC')
      .take(200);
    if (month) qb.andWhere('e.month = :month', { month });
    return qb.getMany();
  }
}
