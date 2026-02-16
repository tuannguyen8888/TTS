import { Injectable } from '@nestjs/common';

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

@Injectable()
export class MetricsService {
  private ttsLatencies: number[] = [];
  private callbackDelays: number[] = [];
  private successCount = 0;
  private errorCount = 0;

  private maxSamples = 10000;

  observeTtsLatency(ms: number) {
    this.ttsLatencies.push(ms);
    if (this.ttsLatencies.length > this.maxSamples) this.ttsLatencies.shift();
  }

  observeRunpodCallbackDelay(ms: number) {
    this.callbackDelays.push(ms);
    if (this.callbackDelays.length > this.maxSamples) this.callbackDelays.shift();
  }

  incSuccess() {
    this.successCount += 1;
  }

  incError() {
    this.errorCount += 1;
  }

  snapshot() {
    const total = this.successCount + this.errorCount;
    return {
      p95_latency: percentile(this.ttsLatencies, 95),
      error_rate: total === 0 ? 0 : this.errorCount / total,
      tts_success_rate: total === 0 ? 0 : this.successCount / total,
      runpod_callback_delay: percentile(this.callbackDelays, 95),
      total_success: this.successCount,
      total_error: this.errorCount,
    };
  }
}

