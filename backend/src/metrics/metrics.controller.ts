import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HmacGuard } from '../common/hmac.guard';
import { MetricsService } from './metrics.service';

@ApiTags('internal')
@Controller('internal/v1')
@UseGuards(HmacGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('metrics')
  getMetrics() {
    return this.metrics.snapshot();
  }
}
