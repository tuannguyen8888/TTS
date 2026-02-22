import { Module } from '@nestjs/common';
import { HmacGuard } from '../common/hmac.guard';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, HmacGuard],
  exports: [MetricsService],
})
export class MetricsModule {}
