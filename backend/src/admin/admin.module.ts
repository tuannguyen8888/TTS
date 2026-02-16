import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../apikey/entities/api-key.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Tenant } from '../auth/entities/tenant.entity';
import { BillingLedger } from '../billing/entities/billing-ledger.entity';
import { TtsJob } from '../tts/entities/tts-job.entity';
import { UsageEvent } from '../usage/entities/usage-event.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      User,
      Tenant,
      ApiKey,
      TtsJob,
      UsageEvent,
      BillingLedger,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

