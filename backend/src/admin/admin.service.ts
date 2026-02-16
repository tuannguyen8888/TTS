import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../apikey/entities/api-key.entity';
import { User } from '../auth/entities/user.entity';
import { Tenant } from '../auth/entities/tenant.entity';
import { BillingLedger } from '../billing/entities/billing-ledger.entity';
import { TtsJob } from '../tts/entities/tts-job.entity';
import { UsageEvent } from '../usage/entities/usage-event.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
    @InjectRepository(TtsJob)
    private readonly ttsJobs: Repository<TtsJob>,
    @InjectRepository(UsageEvent)
    private readonly usage: Repository<UsageEvent>,
    @InjectRepository(BillingLedger)
    private readonly billing: Repository<BillingLedger>,
  ) {}

  async getOverview() {
    const [
      totalTenants,
      totalUsers,
      totalJobs,
      activeApiKeys,
      usageRows,
      billingRows,
    ] = await Promise.all([
      this.tenants.count(),
      this.users.count(),
      this.ttsJobs.count(),
      this.apiKeys.count({ where: { status: 'active' } }),
      this.usage.find({ select: { charCount: true } }),
      this.billing.find({ select: { amount: true } }),
    ]);

    const totalChars = usageRows.reduce((s, row) => s + row.charCount, 0);
    const totalRevenueEstimate = billingRows.reduce(
      (s, row) => s + parseFloat(row.amount || '0'),
      0,
    );

    return {
      totalTenants,
      totalUsers,
      totalJobs,
      activeApiKeys,
      totalChars,
      totalRevenueEstimate,
    };
  }

  async listTenants() {
    return this.tenants.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async listUsers() {
    return this.users.find({
      select: {
        id: true,
        email: true,
        isVerified: true,
        isSuperAdmin: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
      take: 300,
    });
  }
}

