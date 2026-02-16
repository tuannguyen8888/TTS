import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApikeyModule } from '../apikey/apikey.module';
import { BillingModule } from '../billing/billing.module';
import { ApikeyGuard } from '../common/apikey.guard';
import { HmacGuard } from '../common/hmac.guard';
import { MetricsModule } from '../metrics/metrics.module';
import { UsageModule } from '../usage/usage.module';
import { TtsJob } from './entities/tts-job.entity';
import { InternalTtsController } from './internal/internal-tts.controller';
import { TtsController } from './tts.controller';
import { TtsService } from './tts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TtsJob]),
    ApikeyModule,
    UsageModule,
    BillingModule,
    MetricsModule,
  ],
  controllers: [TtsController, InternalTtsController],
  providers: [TtsService, HmacGuard, ApikeyGuard],
  exports: [TtsService],
})
export class TtsModule {}
