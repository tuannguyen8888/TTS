import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('internal')
@Controller('internal/v1')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('metrics')
  getMetrics() {
    return this.metrics.snapshot();
  }
}

